# 🚀 FastAPI Social Media API

A full-featured RESTful API built with **FastAPI** and **PostgreSQL** for a social media-style application. Supports user authentication, CRUD operations on posts, and a voting/like system.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://python-api-development-2.onrender.com)
[![API Docs](https://img.shields.io/badge/API%20Docs-Swagger%20UI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](https://python-api-development-2.onrender.com/docs)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [API Documentation](#-api-documentation)
  - [Authentication](#authentication)
  - [Users](#users)
  - [Posts](#posts)
  - [Votes](#votes)
- [Database Schema](#-database-schema)
- [Deployment](#-deployment)
- [License](#-license)

---

## ✨ Features

- **User Registration & Authentication** — Secure signup and login with hashed passwords (bcrypt) and JWT tokens.
- **CRUD Operations on Posts** — Create, read, update, and delete posts with ownership enforcement.
- **Voting / Like System** — Upvote or remove votes on posts with duplicate vote prevention.
- **Query Parameters** — Search posts by title, with pagination support (limit & offset).
- **Input Validation** — Request body validation using Pydantic schemas with constraints (e.g., password length).
- **Database Migrations** — Schema versioning with Alembic.
- **CORS Enabled** — Cross-Origin Resource Sharing configured for frontend integration.
- **Auto-generated API Docs** — Interactive Swagger UI and ReDoc documentation.

---

## 🛠 Tech Stack

| Component        | Technology                                                  |
| ---------------- | ----------------------------------------------------------- |
| **Framework**    | [FastAPI](https://fastapi.tiangolo.com/) 0.104.1            |
| **Database**     | [PostgreSQL](https://www.postgresql.org/)                   |
| **ORM**          | [SQLAlchemy](https://www.sqlalchemy.org/) 2.0.23            |
| **Migrations**   | [Alembic](https://alembic.sqlalchemy.org/) 1.18.4           |
| **Auth**         | [PyJWT](https://pyjwt.readthedocs.io/) + [Passlib](https://passlib.readthedocs.io/) (bcrypt) |
| **Validation**   | [Pydantic](https://docs.pydantic.dev/) 2.5.0                |
| **Server**       | [Uvicorn](https://www.uvicorn.org/) 0.24.0                  |
| **Deployment**   | [Render](https://render.com/)                               |

---

## 📁 Project Structure

```
FastAPI/
├── app/
│   ├── __init__.py          # Package initializer
│   ├── main.py              # Application entry point & CORS config
│   ├── database.py          # Database connection & session management
│   ├── models.py            # SQLAlchemy ORM models (User, Post, Vote)
│   ├── schema.py            # Pydantic schemas for request/response validation
│   ├── oauth2.py            # JWT token creation & verification
│   ├── utils.py             # Password hashing utilities
│   └── routers/
│       ├── auth.py          # Login endpoint
│       ├── user.py          # User registration & retrieval
│       ├── post.py          # Post CRUD operations
│       └── vote.py          # Voting system
├── alembic/
│   ├── env.py               # Alembic environment config
│   └── versions/            # Database migration scripts
├── alembic.ini              # Alembic configuration
├── requirements.txt         # Python dependencies
├── Procfile                 # Process configuration for deployment
├── render.yaml              # Render deployment configuration
├── .env                     # Environment variables (not tracked in git)
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **PostgreSQL** (running locally or a remote instance)
- **Git**

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Timileyhin-Quadri/Python-API-Development-.git
   cd Python-API-Development-
   ```

2. **Create and activate a virtual environment:**

   ```bash
   python -m venv .venv

   # Windows
   .venv\Scripts\activate

   # macOS/Linux
   source .venv/bin/activate
   ```

3. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database_name>

SECRET_KEY=<your-secret-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

| Variable                     | Description                              | Example                                               |
| ---------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`               | PostgreSQL connection string             | `postgresql://postgres:password@localhost:5432/fastapi`|
| `SECRET_KEY`                 | Secret key for JWT token signing         | Generate with: `openssl rand -hex 32`                 |
| `ALGORITHM`                  | JWT signing algorithm                    | `HS256`                                               |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| Token expiration time in minutes         | `60`                                                  |

### Database Setup

**Option A: Auto-create tables** (default behavior)

Tables are automatically created on application startup via `models.Base.metadata.create_all()`.

**Option B: Using Alembic migrations**

```bash
# Run all migrations
alembic upgrade head

# Create a new migration (after modifying models)
alembic revision --autogenerate -m "description of changes"
```

### Running the Application

```bash
uvicorn app.main:app --reload
```

The API will be available at **http://127.0.0.1:8000**

---

## 📖 API Documentation

Once the application is running, interactive documentation is available at:

- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### Authentication

All endpoints except user creation and the root health check require a valid JWT token.

| Method | Endpoint | Description        | Auth Required |
| ------ | -------- | ------------------ | ------------- |
| `POST` | `/login` | Login & get token  | ❌            |

**Request** (form data):
```
username: user@example.com
password: yourpassword
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

> **Usage:** Include the token in the `Authorization` header for protected endpoints:
> ```
> Authorization: Bearer <access_token>
> ```

---

### Users

| Method | Endpoint      | Description        | Auth Required |
| ------ | ------------- | ------------------ | ------------- |
| `POST` | `/users`      | Create a new user  | ❌            |
| `GET`  | `/users/{id}` | Get user by ID     | ❌            |

**Create User — Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response** (`201 Created`):
```json
{
  "id": 1,
  "email": "user@example.com",
  "created_at": "2026-03-16T12:00:00.000000+00:00"
}
```

> **Note:** Password must be between 6 and 72 characters.

---

### Posts

All post endpoints require authentication.

| Method   | Endpoint      | Description                        | Auth Required |
| -------- | ------------- | ---------------------------------- | ------------- |
| `GET`    | `/posts`      | Get all posts (with vote counts)   | ✅            |
| `POST`   | `/posts`      | Create a new post                  | ✅            |
| `GET`    | `/posts/{id}` | Get a single post (with vote count)| ✅            |
| `PUT`    | `/posts/{id}` | Update a post (owner only)         | ✅            |
| `DELETE` | `/posts/{id}` | Delete a post (owner only)         | ✅            |

**Query Parameters** for `GET /posts`:

| Parameter | Type   | Default | Description                |
| --------- | ------ | ------- | -------------------------- |
| `limit`   | int    | 10      | Number of posts to return  |
| `skip`    | int    | 0       | Number of posts to skip    |
| `search`  | string | ""      | Search posts by title      |

**Create Post — Request Body:**
```json
{
  "title": "My First Post",
  "content": "This is the content of my post.",
  "published": true
}
```

**Response** (`201 Created`):
```json
{
  "title": "My First Post",
  "content": "This is the content of my post.",
  "published": true,
  "id": 1,
  "created_at": "2026-03-16T12:00:00.000000+00:00",
  "owner_id": 1,
  "owner": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2026-03-16T12:00:00.000000+00:00"
  }
}
```

---

### Votes

| Method | Endpoint | Description           | Auth Required |
| ------ | -------- | --------------------- | ------------- |
| `POST` | `/vote`  | Vote or unvote a post | ✅            |

**Request Body:**
```json
{
  "post_id": 1,
  "dir": 1
}
```

| Field     | Type | Description                                 |
| --------- | ---- | ------------------------------------------- |
| `post_id` | int  | ID of the post to vote on                   |
| `dir`     | int  | `1` to upvote, `0` to remove an existing vote |

---

## 🗄 Database Schema

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      users       │       │      posts       │       │      votes       │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ user_id (PK, FK) │
│ email (UNIQUE)   │◄──────│ owner_id (FK)    │       │ post_id (PK, FK) │
│ password         │       │ title            │       └────────┬─────────┘
│ created_at       │       │ content          │                │
└──────────────────┘       │ published        │◄───────────────┘
                           │ created_at       │
                           └──────────────────┘
```

**Relationships:**
- A **User** can have many **Posts** (one-to-many)
- A **User** can vote on many **Posts** (many-to-many via `votes`)
- Deleting a user cascades to their posts and votes

---

## ☁ Deployment

This application is deployed on **[Render](https://render.com/)**.

**Live URL:** [https://python-api-development-2.onrender.com](https://python-api-development-2.onrender.com)

### Deploy to Render

1. Push your code to GitHub.
2. Create a new **Web Service** on Render and connect your repository.
3. Configure the following:

   | Setting          | Value                                              |
   | ---------------- | -------------------------------------------------- |
   | **Runtime**      | Python                                             |
   | **Build Command**| `pip install -r requirements.txt`                  |
   | **Start Command**| `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

4. Set **Environment Variables** in the Render dashboard:
   - `DATABASE_URL` — Full PostgreSQL connection string to a remote database
   - `SECRET_KEY` — Your JWT secret key
   - `ALGORITHM` — `HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES` — `60`

> **Note:** The free tier does not include a PostgreSQL database. Use an external provider like [Neon](https://neon.tech), [Supabase](https://supabase.com), or Render's paid PostgreSQL add-on.

---

## 📄 License

This project is open source and available for learning and reference purposes.
