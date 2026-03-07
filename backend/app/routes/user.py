from typing import List
import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlmodel import Session, select

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models.models import User, UserPublic, UserCreate, UserUpdate, UsersList
from app.core.audit import AuditService
from app.core.audit_middleware import get_audit_meta

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=UsersList)
def list_users(
	limit: int = 100,
	offset: int = 0,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
	request: Request = None
):
	if current_user.role.lower() != "admin":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

	statement = select(User).offset(offset).limit(limit)
	results = db.exec(statement).all()

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

	return UsersList(data=results, count=len(results))


@router.get("/{user_id}", response_model=UserPublic)
def get_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), request: Request = None):
	if current_user.role.lower() != "admin":
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
	
	return user


@router.post("/", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), request: Request = None):
	if current_user.role.lower() != "admin":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
	# TODO: hash or generate password, send invitation email
	new_user = User(
		firstName=payload.firstName,
		lastName=payload.lastName,
		email=payload.email,
		role=payload.role.lower(),
		passwordHash="",
	)
	existing = db.exec(select(User).where(User.email == payload.email)).first()
	if existing:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists")
	db.add(new_user)
	db.commit()
	db.refresh(new_user)
	
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


@router.put("/{user_id}", response_model=UserPublic)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), request: Request = None):
	if current_user.role.lower() != "admin":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	
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
	
	return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), request: Request = None):
	if current_user.role.lower() != "admin":
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