# SOC Analyzer — Complete Setup Guide (macOS + VS Code)

This guide combines both:

* Running WITHOUT Docker (local setup)
* Running WITH Docker (recommended for demos/interviews)

---

# Quick Recommendation

| Situation                          | Recommended Setup |
| ---------------------------------- | ----------------- |
| Fastest/easiest startup            | Docker            |
| Debugging backend/frontend locally | Without Docker    |
| Interview/demo submission          | Docker            |
| First-time learning setup          | Without Docker    |

---

# Requirements

## Common

* macOS
* VS Code

## For Docker setup

* Docker Desktop installed and running

## For local setup

* Homebrew
* PostgreSQL 16
* Python 3.11+
* Node.js 20+

---

# Option 1 — Run WITH Docker (Recommended)

## One-time setup

### Install Docker Desktop

Download:
[https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)

Install and launch Docker Desktop.
Wait until the whale icon becomes stable.

Verify:

```bash
docker --version
docker compose version
docker ps
```

---

## Start the application

Open VS Code terminal.

Go to project root:

```bash
cd ~/Projects/soc-analyzer
```

IMPORTANT:

* Do NOT activate venv
* Do NOT run pip install
* Do NOT run npm install

If local Postgres is running, stop it:

```bash
brew services stop postgresql@16
```

Now start everything:

```bash
docker compose up --build
```

Wait until you see:

```text
backend-1   | INFO: Uvicorn running on http://0.0.0.0:8000
frontend-1  | VITE ready
```

---

## Open the app

Frontend:

```text
http://localhost:5173
```

Backend docs:

```text
http://localhost:8000/docs
```

Login:

```text
Username: analyst
Password: analyst123
```

---

## Future runs (fast path)

```bash
cd ~/Projects/soc-analyzer
docker compose up
```

No --build needed unless dependencies changed.

---

## Stop Docker app

Inside terminal:

```text
Ctrl + C
```

Or:

```bash
docker compose down
```

---

## Useful Docker commands

### Check running containers

```bash
docker compose ps
```

### See ports

```bash
docker ps
```

### Backend logs

```bash
docker compose logs -f backend
```

### Frontend logs

```bash
docker compose logs -f frontend
```

### Database shell

```bash
docker compose exec db psql -U soc -d soc_db
```

---

# Option 2 — Run WITHOUT Docker (Local Setup)

Use this if you want easier debugging.

---

# One-time setup

## Install Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

---

## Install PostgreSQL

```bash
brew install postgresql@16
brew services start postgresql@16
```

Verify:

```bash
pg_isready
```

Should say:

```text
accepting connections
```

---

## Install Python

```bash
brew install python@3.11
```

---

## Install Node

```bash
brew install node@20
```

---

## Create database

```bash
psql postgres
```

Run:

```sql
CREATE USER soc WITH PASSWORD 'soc_password';
CREATE DATABASE soc_db OWNER soc;
GRANT ALL PRIVILEGES ON DATABASE soc_db TO soc;
\q
```

Verify:

```bash
psql -U soc -d soc_db -h localhost -c "SELECT 1;"
```

---

# Per-project setup (new ZIP/project only)

## Backend setup

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Frontend setup

```bash
cd frontend
npm install
```

---

# Every time you run locally

## Terminal 1 — Backend

```bash
brew services start postgresql@16

cd backend
source .venv/bin/activate
export DATABASE_URL=postgresql://soc:soc_password@localhost:5432/soc_db

uvicorn app.main:app --reload --port 8000
```

---

## Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

---

## Open app

```text
http://localhost:5173
```

Backend docs:

```text
http://localhost:8000/docs
```

---

# Common Troubleshooting

## Port already in use

```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

---

## PostgreSQL not running

```bash
brew services start postgresql@16
```

---

## Python package errors

Activate venv:

```bash
source .venv/bin/activate
```

Reinstall:

```bash
pip install -r requirements.txt
```

---

## Frontend dependency issues

```bash
npm install
```

---

## Docker port conflicts

Stop local Postgres:

```bash
brew services stop postgresql@16
```

---

# Best Workflow

## Recommended for interviews/demo

```bash
cd ~/Projects/soc-analyzer
docker compose up --build
```

Simple one-command startup.

---

# Important Notes

## Docker usage

Run Docker commands from:

```text
project root folder
```

NOT from:

* backend/
* frontend/
* .venv/

---

## Venv usage

Only use venv for local (non-Docker) setup.

Docker does NOT use your local venv.

---

# Expected ports

| Service     | Port |
| ----------- | ---- |
| Frontend    | 5173 |
| Backend API | 8000 |
| PostgreSQL  | 5432 |

---

# Final Demo Checklist

* Docker Desktop running
* From project root:

```bash
docker compose up --build
```

* Open:

```text
http://localhost:5173
```

* Login:

```text
analyst / analyst123
```

* Upload:

```text
sample_logs/with_anomalies.log
```

* Run anomaly detection
* Verify anomalies tab loads correctly
