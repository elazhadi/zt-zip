from datetime import datetime, timedelta
from typing import Optional
import bcrypt as _bcrypt
from jose import jwt, JWTError
from ..config import settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30


def hash_password(password: str) -> str:
    salt = _bcrypt.gensalt(rounds=12)
    return _bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not plain or not hashed:
        return False
    try:
        return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception as e:
        print(f"❌ verify_password error: {e}")
        return False


def create_access_token(user_id: int, email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "email": email, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
