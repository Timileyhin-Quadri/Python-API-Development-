from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Log a masked version of the URL for debugging (hide password)
if SQLALCHEMY_DATABASE_URL:
    # Show just the scheme and host portion for debugging
    parts = SQLALCHEMY_DATABASE_URL.split("@")
    if len(parts) > 1:
        print(f"DATABASE_URL is set, connecting to: ...@{parts[-1]}")
    else:
        print("DATABASE_URL is set")
else:
    raise ValueError("DATABASE_URL environment variable is not set")

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
