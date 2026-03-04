from jose import jwt
from app.core import security, config


def test_hash_and_verify_password():
    raw = "s3cret_password"
    hashed = security.hash_password(raw)
    assert security.verify_password(raw, hashed) is True
    assert security.verify_password("wrong", hashed) is False

def test_create_access_token():
    data = {"sub": "user123", "role": "USER"}
    token = security.create_access_token(data)
    decoded = jwt.decode(token, config.settings.JWT_SECRET_KEY, algorithms=[config.settings.JWT_ALGORITHM])
    assert decoded["sub"] == "user123"
    assert decoded["role"] == "USER"

def test_create_refresh_token():
    data = {"sub": "user123"}
    token = security.create_refresh_token(data)
    decoded = jwt.decode(token, config.settings.REFRESH_SECRET_KEY, algorithms=[config.settings.JWT_ALGORITHM])
    assert decoded["sub"] == "user123"
