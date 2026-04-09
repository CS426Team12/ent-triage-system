from datetime import datetime
import logging

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


def get_role_rank(role: str, is_admin: bool = False) -> int:
  if role == "superuser":
      return 3
  if role == "admin" or is_admin:
      return 2
  return 1


def get_user_rank(user: User) -> int:
  return get_role_rank(user.role, user.isAdmin)

@router.get("/", response_model=UsersList)
def list_users(
	limit: int = 100,
	offset: int = 0,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
	request: Request = None
):
	if get_user_rank(current_user) < 2:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

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
	if get_user_rank(current_user) < 2:
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
		logger.exception("Failed to write audit log for get user")

	return build_user_public(user, db)


@router.post("/", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), request: Request = None):
	actor_rank = get_user_rank(current_user)
	if actor_rank < 2:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

	existing = db.exec(select(User).where(User.email == payload.email)).first()
	if existing:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists")

	if payload.role.lower() == "admin" and not payload.isAdmin:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Admin role requires admin permissions")

	target_rank = get_role_rank(payload.role.lower(), payload.isAdmin or False)
	if target_rank >= actor_rank:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create a user with this role")

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

@router.patch("/{user_id}", response_model=UserPublic)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), request: Request = None):
	actor_rank = get_user_rank(current_user)
	if actor_rank < 2:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

	target_rank = get_user_rank(user)
	if actor_rank <= target_rank:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this user")

	# only superuser can grant or revoke isAdmin
	if payload.isAdmin is not None and actor_rank < 3:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify admin permissions")

	# role changes must not result in a rank at or above the actor's rank
	if payload.role is not None:
		new_is_admin = payload.isAdmin if payload.isAdmin is not None else user.isAdmin
		new_rank = get_role_rank(payload.role.lower(), new_is_admin)
		if new_rank >= actor_rank:
			raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to assign this role")

	if payload.role and payload.role.lower() == "admin" and payload.isAdmin is False:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Admin role requires admin permissions")

	# only superuser can reactivate users
	if payload.isActive is True and actor_rank < 3:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to reactivate users")

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
