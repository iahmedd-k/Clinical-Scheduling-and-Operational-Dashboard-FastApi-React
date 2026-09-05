# SmartHealth

SmartHealth is organized as two ready-to-run applications:

| Component | Location | Status |
| --- | --- | --- |
| Backend API | [`backend/`](backend/) | Ready |
| Frontend dashboard | [`frontend/`](frontend/) | Ready |

## Backend

The backend is a FastAPI healthcare scheduling and clinic operations service. It includes authentication, role-based access, patient and provider workflows, appointment scheduling, background workers, audit logging, metrics, and the healthcare assistant.

See the [backend README](backend/README.md) for architecture, configuration, Docker, migrations, and API details.

## Frontend

The frontend is a Vite and React operations dashboard for the SmartHealth workflows. It includes overview, patient, provider, front desk, and administration views, along with assistant and search interfaces.

Start it from the `frontend/` directory:

```powershell
cd frontend
npm install
npm run dev
```

The production build is available with:

```powershell
npm run build
```

## Repository layout

```text
backend/     FastAPI service, workers, migrations, and backend tests
frontend/    React/Vite dashboard and frontend assets
```

The backend and frontend are kept separate so they can be developed, tested, deployed, and scaled independently.