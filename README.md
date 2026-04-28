# SOC Log Analyzer

A full-stack web application that lets SOC analysts upload ZScaler-style web-proxy logs, parse them into structured events, and surface anomalies with explainable reasons and confidence scores.

Built as a take-home exercise for the Tenex.ai full-stack cybersecurity role.

---

## Quick start

One command, assuming Docker and Docker Compose are installed:

```bash
git clone <this-repo>
cd soc-analyzer
docker-compose up --build
```

Wait ~60 seconds for the first build. Then:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Interactive API docs (Swagger):** http://localhost:8000/docs

**Default login:** `analyst` / `analyst123`

Upload a sample log from `sample_logs/` to try it out:
- `normal.log` — 400 benign events
- `with_anomalies.log` — 765 events including planted threats (recommended for the demo)

---

## What it does

1. Analyst logs in (session-based JWT auth).
2. Uploads a `.log` or `.txt` file of ZScaler web-proxy events.
3. Backend parses every line, stores structured rows in Postgres.
4. Results page shows summary stats + full event table.
5. Click **Run anomaly detection** — backend runs three detectors, returns findings with reason + confidence. Flagged rows are highlighted in the event view.

---

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│ React frontend  │ ──HTTP─▶│ FastAPI backend  │ ──SQL──▶│  Postgres   │
│ TypeScript      │  JWT    │ Python 3.11      │         │  16         │
│ Tailwind + Vite │         │ SQLAlchemy ORM   │         │             │
└─────────────────┘         └──────────────────┘         └─────────────┘
       :5173                        :8000                      :5432
```

All three services run in Docker Compose on an internal network. Only `5173` and `8000` are exposed to the host.

### Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Required by prompt; Vite gives fast HMR in dev |
| Styling | Tailwind CSS | Rapid UI iteration without handwritten CSS |
| State | React Context (auth only) | App is simple; no need for Redux/Zustand |
| Backend | FastAPI | Auto-generated OpenAPI docs, Pydantic validation, native async |
| ORM | SQLAlchemy 2.0 | Standard for FastAPI + Postgres |
| DB | PostgreSQL 16 | Prompt recommends; real ACID guarantees for audit trails |
| Auth | JWT (python-jose) + bcrypt | Stateless, industry standard |
| ML | scikit-learn Isolation Forest | Explainable, fast, no LLM needed |
| Deploy | Docker Compose | One-command local setup |

### Project layout

```
soc-analyzer/
├── backend/
│   └── app/
│       ├── main.py           # FastAPI app factory + startup seed
│       ├── config.py         # Env-based settings
│       ├── database.py       # SQLAlchemy engine, session, Base
│       ├── models.py         # 4 ORM tables
│       ├── schemas.py        # Pydantic request/response shapes
│       ├── auth.py           # bcrypt + JWT + get_current_user dep
│       ├── parser.py         # Pure ZScaler line parser
│       ├── anomaly.py        # 3-layer detection engine
│       └── routes/
│           ├── auth.py       # POST /auth/login
│           ├── uploads.py    # POST/GET /uploads, /uploads/{id}
│           └── anomalies.py  # POST /uploads/{id}/analyze + GET anomalies
├── frontend/
│   └── src/
│       ├── pages/            # Login, Upload, Results
│       ├── components/       # Shell, StatsCards, LogTable, AnomalyTable, ProtectedRoute
│       ├── contexts/         # AuthContext
│       ├── lib/api.ts        # axios instance with token interceptor
│       └── types/            # Shared TypeScript types
├── sample_logs/
│   ├── normal.log
│   ├── with_anomalies.log
│   └── generate.py
├── docker-compose.yml
├── .env.example
└── README.md
```

### Database schema

- **users** — `id, username, password_hash, created_at`
- **uploads** — `id, filename, uploaded_at, row_count, analyzed, user_id`
- **log_entries** — `id, upload_id, timestamp, username, src_ip, dst, bytes_transferred, status, category, action`
- **anomalies** — `id, upload_id, log_entry_id, reason, confidence, method, detected_at`

Indexes: `log_entries(upload_id, timestamp)` for fast timeline queries; `anomalies(upload_id)` for fast anomaly listing.

### API endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `POST` | `/auth/login` | Exchange credentials for JWT | No |
| `POST` | `/uploads` | Upload a log file, parse it, persist rows | Yes |
| `GET` | `/uploads` | List current user's uploads | Yes |
| `GET` | `/uploads/{id}` | Fetch parsed rows + computed stats | Yes |
| `POST` | `/uploads/{id}/analyze` | Run anomaly detection | Yes |
| `GET` | `/uploads/{id}/anomalies` | List detected anomalies | Yes |
| `GET` | `/health` | Health check | No |

Full interactive docs at `/docs` when the backend is running.

---

## Anomaly detection — how and where AI is used

**This is the only place AI/ML is used in the system.** The log parser and everything else are deterministic rules.

### Three layered detectors

The `app/anomaly.py` module runs three independent detectors and combines results. Each detector catches a different threat class — no single approach covers them all.

#### 1. Rule-based (`detect_rule_based`)
Hardcoded SOC heuristics. Fast, high precision, fully explainable.

| Condition | Reason surfaced | Confidence |
|---|---|---|
| Category in `{Malware, Phishing, C2, Botnet, Spyware, Exploit, Ransomware}` | "Category is a known threat class" | 0.95 |
| `action == Blocked` | "Proxy blocked the request" | 0.90 |
| `bytes_transferred >= 5 MB` | "Large single transfer — potential exfiltration" | 0.85 |
| `status >= 500` | "Server error — possible probing" | 0.60 |

#### 2. Statistical (`detect_statistical`)
Z-score anomaly detection over two per-user metrics: request count and total bytes.

- Groups log entries by user.
- Computes mean and std-dev of request counts and byte totals across all users.
- Flags any user whose z-score exceeds 3σ on either metric.
- Confidence scales with z-score magnitude (capped at 0.99).

Catches volume spikes like "Alice normally makes 50 requests/day; today she made 500" even when none of those requests individually look bad.

#### 3. Isolation Forest (`detect_ml`) — the ML/AI component
An unsupervised sklearn model trained on engineered features from the uploaded log itself.

- **Features:** `[bytes_transferred, status_code, hour_of_day, is_blocked]` per log entry.
- **Model:** `IsolationForest(n_estimators=100, contamination=0.05, random_state=42)`.
- **How it works:** The algorithm randomly partitions the feature space; points that get isolated in few splits are considered outliers. It requires no labels — perfectly suited for log data where we don't have ground-truth "bad" examples.
- **Confidence:** Raw anomaly score is normalized to the dataset's min/max, then mapped to 0.60–0.90. ML scores are capped below rule-based to reflect relative reliability.

Catches subtle multi-feature combinations — e.g., a small number of requests at an unusual hour with unusual status codes — that no single rule or per-user statistic would trigger.

### Orchestration and deduplication

`run_all(upload_id, db)`:
1. Deletes any prior anomalies for this upload (idempotent re-runs).
2. Runs all three detectors.
3. For any log entry flagged by multiple detectors, keeps the **highest-confidence** finding and tags it with the winning method.
4. Persists one `Anomaly` row per flagged entry.
5. Marks the upload as `analyzed = True`.

Result: each flagged log entry gets exactly one row in the anomalies table, with a human-readable `reason` and a `confidence` in [0, 1], and a `method` badge (`rule` / `statistical` / `ml`) for the UI.

### Why not an LLM?

Deliberate choice:
- **Determinism** — security tooling must give the same answer on the same input every run.
- **Latency** — Isolation Forest trains on ~1000 rows in <200 ms. An LLM API call per entry would be orders of magnitude slower.
- **Cost** — zero marginal cost per analysis.
- **Explainability** — `IsolationForest` decision functions + engineered features are inspectable; an LLM's reasoning is not.

An LLM would make sense for a *follow-up* step (e.g., "summarize these 50 flagged events into a human-readable incident report") but not for the detection itself.

---

## Auth model

- Passwords hashed with bcrypt (never plaintext, never reversible).
- Login returns a signed JWT (HS256) containing `{sub: user_id, username, exp: +24h}`.
- Frontend stores the token in `localStorage` and attaches it as `Authorization: Bearer <token>` on every request via an axios interceptor.
- Backend has a `get_current_user` FastAPI dependency that validates the token signature and expiry, then loads the user from the DB.
- 401 responses trigger an auto-logout in the frontend.

### Acknowledged trade-offs (things I'd do differently for production)
- **No refresh tokens.** User must re-log in after 24h.
- **localStorage is XSS-vulnerable.** Production should use httpOnly cookies + CSRF tokens.
- **No rate limiting on `/auth/login`.** Production should use `slowapi` or similar.
- **Single hardcoded seed user.** A signup flow is straightforward to add but was deprioritized per the "focus on functionality" guidance in the prompt.

---

## Running locally (non-Docker)

If you prefer to run the stack without Docker:

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Start Postgres yourself, then:
export DATABASE_URL=postgresql://soc:soc_password@localhost:5432/soc_db
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173` and call the backend at `http://localhost:8000` by default. Override with `VITE_API_URL`.

---

## Sample logs

`sample_logs/normal.log` — 400 lines of benign traffic across 10 users. Good for verifying the parser and the UI at rest.

`sample_logs/with_anomalies.log` — 765 lines total, including ~270 planted anomalies:

1. **Malware/phishing blocks** — 6 entries for `alice.chen` hitting malicious domains at 14:02, all blocked by the proxy. Should be caught by the **rule-based** layer with confidence ≥ 0.90.
2. **Request-rate burst** — 250 extra requests from `alice.chen` compressed into 5 minutes. Should be caught by the **statistical** layer (z-score > 3).
3. **Data exfiltration** — one 9.8 MB transfer from `alice.chen` to `data-exfil.xyz`. Should be caught by the **rule-based** layer (large transfer heuristic).
4. **Off-hours scanning pattern** — 8 requests from `bob.smith` at 03:15 against internal APIs, returning 500s. Should be caught by either the **ML** or **rule-based** layer (5xx heuristic).

Regenerate anytime with `python sample_logs/generate.py`.

---

## Testing the full flow

1. `docker-compose up --build`
2. Open http://localhost:5173
3. Login with `analyst` / `analyst123`
4. Drag `sample_logs/with_anomalies.log` onto the upload area
5. On the results page, click **Run anomaly detection**
6. Switch to the **Anomalies** tab — you should see rows with badges for `Rule`, `Statistical`, and `ML` methods, sorted by confidence descending.
7. Switch back to **Events** — flagged rows are highlighted with a red tint.

---

## What's intentionally out of scope

Per the prompt's "focus on functionality over production-readiness":

- No unit tests (would add pytest for the parser and anomaly functions in production).
- No Alembic migrations — `Base.metadata.create_all` is fine for a prototype; production needs proper migrations.
- No streaming upload for huge files — current parser loads each line in memory. For multi-GB logs this would become a Kafka/worker pipeline.
- No multi-tenancy beyond per-user upload isolation.
- No real-time analysis — batch-on-demand only.
- Isolation Forest is trained per-upload. A real system would train on a historical baseline and run inference on new data.

---

## AI-assisted development disclosure

This exercise was developed with assistance from Claude (Anthropic). Claude was used for:
- Scaffolding boilerplate (Docker config, Tailwind setup, Pydantic schemas).
- Drafting the structure of the three detectors; the algorithm choices and feature engineering were reviewed and approved.
- Generating sample log data with planted anomalies.

I (the author) reviewed and can explain every line of code in this repository.

---

## License

Prototype for interview purposes. Not licensed for production use.
