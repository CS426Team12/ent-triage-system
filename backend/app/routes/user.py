from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select

from app.core.config import settings
from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models.models import User, UserPublic, UserCreate, UserUpdate, UsersList
from app.core.security import EmailTokenType
from app.auth.helpers.mailer import send_token_email

router = APIRouter(prefix="/users", tags=["users"])

SET_PASSWORD_URL = str(settings.SET_PASSWORD_URL) 


@router.get("/", response_model=UsersList)
def list_users(
	limit: int = 100,
	offset: int = 0,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	if current_user.role.lower() != "admin":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

	statement = select(User).offset(offset).limit(limit)
	results = db.exec(statement).all()
	return UsersList(data=results, count=len(results))


@router.get("/{user_id}", response_model=UserPublic)
def get_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	if current_user.role.lower() != "admin":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	return user


@router.post("/", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	if current_user.role.lower() != "admin":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
	new_user = User(
		firstName=payload.firstName,
		lastName=payload.lastName,
		email=payload.email,
		role=payload.role.lower(),
		passwordHash="",
		isActive=False
	)
	existing = db.exec(select(User).where(User.email == payload.email)).first()
	if existing:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists")
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
	return new_user


@router.put("/{user_id}", response_model=UserPublic)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	if current_user.role.lower() != "admin":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	
	if payload.firstName is not None:
		user.firstName = payload.firstName
	if payload.lastName is not None:
		user.lastName = payload.lastName
	if payload.email is not None:
		user.email = payload.email
	if payload.role is not None:
		user.role = payload.role.lower()

	db.add(user)
	db.commit()
	db.refresh(user)
	return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	if current_user.role.lower() != "admin":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

	user = db.get(User, user_id)
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	db.delete(user)
	db.commit()
	return