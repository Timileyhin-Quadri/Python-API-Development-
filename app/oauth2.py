import jwt
from jwt import PyJWTError  
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database import get_db
from .schema import TokenData
from fastapi import Depends,HTTPException,status
from fastapi.security import OAuth2PasswordBearer
from . import models
import os
from dotenv import load_dotenv

load_dotenv()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)   # type: ignore

    return encoded_jwt  
    # if expires_delta:
    #     expire = datetime.now(timezone.utc) + expires_delta
    # else:
    #     expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    # to_encode.update({"exp": expire})
    # encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    # return encoded_jwt

def verify_access_token(token: str, credentials_exception):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]) # type: ignore
        id: str = payload.get("user_id")
        if id is None:
            raise credentials_exception
        token_data = TokenData(id=int(id))
    except PyJWTError:
        raise credentials_exception
    return token_data

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, 
                                          detail=f"Could not validate Credentials",headers={"WWW-Authenticate": "Bearer"})
    
    token_data = verify_access_token(token, credentials_exception)
    user = db.query(models.User).filter(models.User.id == token_data.id).first()
    return user 