# AI Study Planner

AI Study Planner is a full-stack project with a React frontend and Flask backend.

## Recommended Project Structure

```
AI-StudyPlanner/
  backend/
    app.py
    ai_models.py
    pdf_processor.py
    requirements.txt
    start_server.bat
    .env.example
    firebase-credentials.json   # local only, never commit
    .venv/ or venv/             # local only, never commit
  frontend/
    src/
    public/
    package.json
    .env.example
    node_modules/               # local only, never commit
  .gitignore
  README.md
```

## Team Rules (Important)

1. Do not commit virtual environments (`.venv` or `venv`).
2. Do not commit secrets (`firebase-credentials.json`, `.env`).
3. Every developer creates their own local env and installs dependencies.
4. Keep `.env.example` updated when env variables change.

## Setup (Windows)

### 1) Backend setup

```powershell
cd backend

# Option A (recommended)
python -m venv .venv
& .\.venv\Scripts\Activate.ps1

# Option B (also valid)
# python -m venv venv
# & .\venv\Scripts\Activate.ps1

pip install -r requirements.txt
copy .env.example .env
```

Then place Firebase service account key at:
- `backend/firebase-credentials.json`

### 2) Frontend setup

Open a new terminal:

```powershell
cd frontend
npm install
copy .env.example .env
```

Update Firebase web config in:
- `frontend/src/firebase/config.js`

## Run the Project

### Backend (Terminal 1)

```powershell
cd backend
.\start_server.bat
```

`start_server.bat` will:
1. Use `.venv` if present
2. Else use `venv` if present
3. Else create `.venv`
4. Install dependencies and start Flask

Backend runs on:
- `http://localhost:5000`

### Frontend (Terminal 2)

```powershell
cd frontend
npm start
```

Frontend runs on:
- `http://localhost:3000`

## Quick Troubleshooting

### Port already in use

```powershell
netstat -ano | findstr :5000
# then stop the process using its PID if needed
```

### Backend fails on first run
- First run can take time due to model/dependency setup.
- Ensure internet is available.
- Verify `backend/firebase-credentials.json` exists.

### Frontend cannot connect to backend
- Ensure backend is running on port 5000.
- Check API base URL in frontend API config if changed.
