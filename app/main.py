from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from . import models
from .database import engine
from .routers import user, post, auth, vote


app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/")
def root():
    """Root endpoint - Health check"""
    return {"message": "Welcome to FastAPI", "status": "running"}

app.include_router(post.router)
app.include_router(user.router)
app.include_router(auth.router)
app.include_router(vote.router)


if __name__ == "__main__":   
    uvicorn.run(app, host="127.0.0.1", port=8000)
