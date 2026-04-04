from datetime import datetime
from typing import List
import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlmodel import Session, select

from app.core.config import settings
from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models.models import User, UserPublic, UserCreate, UserUpdate, UsersList
from app.core.audit import AuditService
from app.core.audit_middleware import get_audit_meta
from app.core.security import EmailTokenType
from app.auth.helpers.mailer import send_token_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

SET_PASSWORD_URL = str(settings.SET_PASSWORD_URL) 

def build_user_public(user: User, db: Session) -> UserPublic:
    deactivated_by_email = None
    if user.deactivatedBy:
        deactivator = db.get(User, user.deactivatedBy)
        if deactivator:
            deactivated_by_email = deactivator.email

    return UserPublic(
        **user.model_dump(),
        deactivatedByEmail=deactivated_by_email,
    )

@router.get("/", response_model=UsersList)
def list_users(
	limit: int = 100,
	offset: int = 0,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
	request: Request = None
):

	statement = select(User).offset(offset).limit(limit)
	results = db.exec(statement).all()
	users_public = [build_user_public(user, db) for user in results]

	try:
		audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
		AuditService.create_log(
			db,
			action="LIST_USERS",
			status="SUCCESS",
			actor_id=current_user.userID,
			actor_type=current_user.role,
			resource_type="USER",
			resource_id=None,
			fields_modified=None,
			changeDetails={"limit": limit, "returned_count": len(results)},
			ip=audit_meta.get("ip"),
		)
	except Exception:
		logger.exception("Failed to write audit log for listing users")

	return UsersList(data=users_public, count=len(users_public))


@router.get("/{user_id}", response_model=UserPublic)
def get_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), request: Request = None):
	if not current_user.isAdmin:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	
	try:
		audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
		AuditService.create_log(
			db,
			action="GET_USER",
			status="SUCCESS",
			actor_id=current_user.userID,
			actor_type=current_user.role,
			resource_type="USER",
			resource_id=user.userID,
			fields_modified=None,
			ip=audit_meta.get("ip"),
		)
	except Exception:
		logger.exception("Failed to write audit log for user creation")
	
	return build_user_public(user, db)


@router.post("/", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), request: Request = None):
	if not current_user.isAdmin:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

	existing = db.exec(select(User).where(User.email == payload.email)).first()
	if existing:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists")

	if payload.role.lower() == "admin" and not payload.isAdmin:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Users with role 'admin' must have admin permissions enabled")

	# TODO: hash or generate password, send invitation email
	new_user = User(
		firstName=payload.firstName,
		lastName=payload.lastName,
		email=payload.email,
		role=payload.role.lower(),
		isAdmin=payload.isAdmin,
		passwordHash="",
		isActive=False
	)
	db.add(new_user)
	db.commit()
	db.refresh(new_user)
	send_token_email(
			user_email=new_user.email,
			user_id=str(new_user.userID),
			token_type=EmailTokenType.REGISTER,
			template_name="create-password",
			base_url=str(settings.SET_PASSWORD_URL)
	)
	
	# Log user creation
	try:
		audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
		AuditService.create_log(
			db,
			action="CREATE_USER",
			status="SUCCESS",
			actor_id=current_user.userID,
			actor_type=current_user.role,
			resource_type="USER",
			resource_id=new_user.userID,
			fields_modified=["firstName", "lastName", "email", "role"],
			ip=audit_meta.get("ip"),
		)
	except Exception:
		logger.exception("Failed to write audit log for user creation")
	
	return new_user

def get_role_rank(u: User) -> int:
    if u.role == "superuser":
        return 3
    if u.role == "admin" or u.isAdmin:
        return 2
    return 1

@router.patch("/{user_id}", response_model=UserPublic)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), request: Request = None):
	if not current_user.isAdmin:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

	if payload.role and payload.role.lower() == "admin" and not payload.isAdmin:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Users with role 'admin' must have admin permissions enabled")

	if payload.isActive is False and user.isActive:
			if get_role_rank(current_user) <= get_role_rank(user):
				raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to deactivate this user")

	modified_fields = []
	if payload.firstName is not None:
		user.firstName = payload.firstName
		modified_fields.append("firstName")
	if payload.lastName is not None:
		user.lastName = payload.lastName
		modified_fields.append("lastName")
	if payload.email is not None:
		user.email = payload.email
		modified_fields.append("email")
	if payload.role is not None:
		user.role = payload.role.lower()
		modified_fields.append("role")
	if payload.isAdmin is not None:
		user.isAdmin = payload.isAdmin
		modified_fields.append("isAdmin")
	if payload.isActive is not None:
		user.isActive = payload.isActive
		modified_fields.append("isActive")
		user.deactivatedAt = None if payload.isActive else datetime.now()
		user.deactivatedBy = None if payload.isActive else current_user.userID
		modified_fields.extend(["deactivatedAt", "deactivatedBy"])

	db.add(user)
	db.commit()
	db.refresh(user)
	
	# Log user update
	if modified_fields:
		try:
			audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
			AuditService.create_log(
				db,
				action="UPDATE_USER",
				status="SUCCESS",
				actor_id=current_user.userID,
				actor_type=current_user.role,
				resource_type="USER",
				resource_id=user.userID,
				fields_modified=modified_fields,
				ip=audit_meta.get("ip"),
			)
		except Exception:
			logger.exception("Failed to write audit log for user update")
	
	return build_user_public(user, db)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), request: Request = None):
	if not current_user.isAdmin:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	db.delete(user)
	db.commit()
	
	# Log user deletion
	try:
		audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
		AuditService.create_log(
			db,
			action="DELETE_USER",
			status="SUCCESS",
			actor_id=current_user.userID,
			actor_type=current_user.role,
			resource_type="USER",
			resource_id=UUID(user_id) if user_id else None,
			fields_modified=None,
			ip=audit_meta.get("ip"),
		)
	except Exception:
		logger.exception("Failed to write audit log for user deletion")
	
	return