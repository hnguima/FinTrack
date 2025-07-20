# FinTrack Server

FinTrack Server is the backend API for the FinTrack finance tracking assistant. It is built with Flask (Python) and provides secure, RESTful endpoints for user authentication, financial data management, and integration with a React/TypeScript frontend and mobile app.

## Features

- **User Authentication**: JWT-based login, Google OAuth, and session support
- **User Profile**: Profile info, photo upload, preferences (theme, language)
- **Accounts**: CRUD for financial accounts (bank, cash, etc.)
- **Entries**: Track expenses, income, transfers
- **Budgets & Goals**: Set and monitor budgets/goals
- **Investments**: Track investment assets and performance
- **Tags**: Categorize entries with user-defined tags
- **Reports**: (Planned) Analytics and export endpoints
- **Multi-currency**: (Planned) Support for multiple currencies
- **Mobile Ready**: Designed for web and Android via Capacitor

## Directory Structure

```
server/
├── api/            # Flask blueprints (users.py, finance.py)
├── core/           # Core modules (db_manager.py, token_auth.py, oauth.py)
├── certs/          # SSL certificates
├── db/             # SQLite database files
├── flask_session/  # Flask session files
├── ignore/         # Legacy, backup, and docs
├── tests/          # Unit/integration tests (optional)
├── app.py          # Main Flask app entry point
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── ...
```

## Key Files

- `app.py` — Main Flask app, blueprint registration, HTTPS setup
- `api/users.py` — User management endpoints (profile, auth, photo)
- `api/finance.py` — Financial data endpoints (accounts, entries, budgets, etc.)
- `core/db_manager.py` — Unified DB schema and operations
- `core/token_auth.py` — JWT creation/validation, Flask auth decorators
- `core/oauth.py` — Google OAuth integration

## Setup & Usage

### 1. Install dependencies
```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Initialize databases
```bash
python app.py  # Databases auto-initialize on first run
```

### 3. Run the server
```bash
python app.py
```
- By default, runs on HTTPS (see `certs/` for SSL setup)
- For Docker: `docker compose up --build`

### 4. API Endpoints
- `/api/auth/token` — Get JWT token
- `/api/users/profile` — Get/update user profile
- `/api/accounts` — Manage accounts
- `/api/entries` — Manage entries
- `/api/budgets` — Manage budgets
- `/api/investments` — Manage investments
- `/api/tags` — Manage tags

## Environment Variables
- `DB_PATH` — Path to user database (default: `db/user.db`)
- `DATA_DB_PATH` — Path to finance database (default: `db/data.db`)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — For OAuth

## Development & Testing
- Use `tests/` for unit/integration tests (pytest recommended)

## Security
- All endpoints require authentication (JWT or session)
- HTTPS enforced by default
- User data is isolated by user ID

## Contributing
- Follow RESTful API and modular code patterns
- Place new endpoints in `api/`, core logic in `core/`

---

For more details, see the code and comments in each module.
