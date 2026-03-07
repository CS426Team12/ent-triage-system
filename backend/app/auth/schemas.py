from sqlmodel import SQLModel

class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"

class LoginRequest(SQLModel):
    email: str
    password: str

class LogoutRequest(SQLModel):
    email: str

class UserResponse(SQLModel):
    userID: str
    email: str
    role: str
    firstName: str
    lastName: str
    first_initial: str


    