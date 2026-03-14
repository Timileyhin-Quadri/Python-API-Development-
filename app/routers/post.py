from fastapi import APIRouter, status, HTTPException, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from .. import models, schema,oauth2
from ..database import get_db

router = APIRouter(prefix="/posts", tags=["posts"])

@router.get("", response_model=list[schema.PostOut])
def get_posts(db: Session = Depends(get_db),current_user: schema.TokenData = Depends(oauth2.get_current_user),
              limit: int = 10, skip: int = 0, search: Optional[str] = ""):
    # cursor.execute("""SELECT * FROM posts""")
    # posts = cursor.fetchall()
    # posts = db.query(models.Post).filter(models.Post.title.contains(search)).offset(skip).limit(limit).all()
    # return posts

    posts= db.query(models.Post, func.count(models.Vote.user_id).label("votes")).join(models.Vote, models.Vote.post_id == models.Post.id, isouter=True).group_by(
        models.Post.id).filter(models.Post.title.contains(search)).offset(skip).limit(limit).all()
   
    return posts


@router.post("", status_code=status.HTTP_201_CREATED, response_model=schema.Post)
def create_posts(post: schema.PostCreate, db: Session = Depends(get_db), 
                 current_user: schema.TokenData = Depends(oauth2.get_current_user)):
    # cursor.execute("""INSERT INTO posts (title, content, published) VALUES (%s, %s, %s) RETURNING *""",
    #                (post.title, post.content, post.published))
    # new_post = cursor.fetchone()
    # conn.commit()
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if user:
        print(user.email)
    new_post = models.Post(owner_id=current_user.id, **post.model_dump())
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post


@router.get("/{id}", response_model=schema.PostOut)
def get_post(id: int, db: Session = Depends(get_db),current_user: schema.TokenData = Depends(oauth2.get_current_user)):
    # cursor.execute("""SELECT * FROM posts WHERE id = %s""", (str(id),))
    # post = cursor.fetchone()
    # if not post:
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
    #                         detail=f"post with id: {id} was not found")
    # return {"post_detail": post}

    # post = db.query(models.Post).filter(models.Post.id == id).first()

    post = db.query(models.Post, func.count(models.Vote.user_id).label("votes")).join(models.Vote, models.Vote.post_id == models.Post.id, isouter=True).group_by(
        models.Post.id).filter(models.Post.id == id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"post with id: {id} was not found")
                            
  
    # if post[0].owner_id != current_user.id: 
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
    #                         detail="Not authorized to perform requested action")
    
    return post
    
  


@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_post(id: int, db: Session = Depends(get_db),current_user: schema.TokenData = Depends(oauth2.get_current_user)):
    # cursor.execute("""DELETE FROM posts WHERE id = %s RETURNING *""", (str(id),))
    # deleted_post = cursor.fetchone()
    # conn.commit()
    post_query = db.query(models.Post).filter(models.Post.id == id)
    post = post_query.first()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"post with id: {id} does not exist")
    if post.owner_id != current_user.id: # type: ignore
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Not authorized to perform requested action")
    post_query.delete(synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{id}", response_model=schema.Post)
def update_post(id: int, updated_post: schema.PostCreate, db: Session = Depends(get_db),
                current_user: schema.TokenData = Depends(oauth2.get_current_user)):
    post_query = db.query(models.Post).filter(models.Post.id == id)
    existing_post = post_query.first()

    if existing_post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"post with id: {id} does not exist")
    if existing_post.owner_id != current_user.id: # type: ignore
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Not authorized to perform requested action")
    post_query.update(updated_post.model_dump(), synchronize_session=False) # type: ignore
    db.commit()
    db.refresh(existing_post)
    return existing_post

