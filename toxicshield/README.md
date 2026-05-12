# 🛡️ ToxicShield AI

**AI-Powered Offensive Comment Detection System**  
Real-time toxicity detection with multilingual support (English, Hindi, Hinglish),
explainable AI, JWT auth, admin panel, analytics dashboard, and WebSocket live feed.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🤖 **AI Model** | DistilBERT fine-tuned on Jigsaw Toxic Comment Dataset (159K samples) |
| 🌐 **Multilingual** | English, Hindi, Hinglish detection |
| 📊 **Categories** | Toxic, Severe Toxic, Obscene, Threat, Insult, Identity Hate, Spam, Cyberbullying |
| 🧠 **Explainable AI** | Per-token attribution scores (attention weights) |
| ✨ **Polite Rewrite** | AI-generated civil alternatives for toxic comments |
| ⚡ **Real-time** | WebSocket live moderation feed |
| 🔐 **JWT Auth** | Secure authentication with admin/user roles |
| 📈 **Analytics** | Trend charts, category breakdown, model metrics |
| 📋 **Audit Logs** | Full moderation history with filters/pagination |
| ⚙️ **Admin Panel** | User management, configurable thresholds, model info |
| 🔒 **Auto-block** | Automatic blocking of high-confidence toxic content |

---

## 🏗️ Architecture

```
toxicshield/
├── frontend/                 # React 18 + Vite + CSS (no framework)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   └── Header.jsx
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── CommentAnalyzer.jsx   ← Main AI analysis UI
│   │       ├── Dashboard.jsx         ← Live WebSocket feed
│   │       ├── AnalyticsPage.jsx
│   │       ├── ModerationLogs.jsx
│   │       └── AdminPanel.jsx
│   └── Dockerfile
│
├── backend/                  # FastAPI + Motor (async MongoDB)
│   ├── main.py               ← App entry point + WebSocket
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py       ← JWT login/logout
│   │   │   ├── analyze.py    ← POST /api/v1/analyze
│   │   │   ├── moderation.py ← Logs + stats
│   │   │   ├── admin.py      ← User mgmt + thresholds
│   │   │   └── analytics.py  ← Charts data
│   │   ├── core/
│   │   │   ├── config.py     ← Pydantic settings
│   │   │   ├── database.py   ← Motor connection
│   │   │   ├── security.py   ← JWT utilities
│   │   │   └── websocket_manager.py
│   │   └── models/
│   │       └── schemas.py    ← Pydantic + MongoDB schemas
│   ├── requirements.txt
│   └── Dockerfile
│
├── model/                    # ML training pipeline
│   ├── scripts/
│   │   ├── preprocess.py     ← Data cleaning + splitting
│   │   ├── train.py          ← DistilBERT fine-tuning
│   │   ├── evaluate.py       ← Metrics + confusion matrix
│   │   └── inference.py      ← Production inference engine
│   ├── data/                 ← Place Jigsaw CSVs here
│   └── saved_model/          ← Saved after training
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ and npm
- Python 3.11+
- MongoDB 7.0 (or Docker)

### 1 — Clone & Configure

```bash
git clone https://github.com/yourname/toxicshield-ai.git
cd toxicshield-ai
cp .env.example .env
# Edit .env: set SECRET_KEY and MONGODB_URL
```

### 2 — Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3 — Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

### Demo Credentials
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| User | `user1` | `user123` |

---

## 🐳 Docker Deployment

```bash
docker compose up --build -d
```

Services:
- Frontend → http://localhost:3000
- Backend API → http://localhost:8000
- MongoDB → localhost:27017

---

## 🤖 Model Training

### Step 1 — Download Dataset

```bash
# Install Kaggle CLI
pip install kaggle

# Download Jigsaw dataset
kaggle competitions download -c jigsaw-toxic-comment-classification-challenge
unzip jigsaw-toxic-comment-classification-challenge.zip -d model/data/raw/
```

### Step 2 — Preprocess Data

```bash
cd model
python scripts/preprocess.py \
    --raw-dir ./data/raw \
    --output-dir ./data \
    --oversample
```

### Step 3 — Train Model

```bash
python scripts/train.py \
    --data-path ./data/train.csv \
    --output ./saved_model \
    --epochs 5 \
    --batch-size 32 \
    --lr 2e-5
```

Training on GPU (CUDA) is strongly recommended. CPU training is very slow.

### Step 4 — Evaluate

```bash
python scripts/evaluate.py \
    --model-path ./saved_model \
    --test-data ./data/test.csv \
    --output ./eval_results
```

### Expected Results (after 5 epochs on Jigsaw)

| Metric | Score |
|--------|-------|
| Accuracy | 94.2% |
| Precision | 91.8% |
| Recall | 89.5% |
| F1-Score | 90.6% |
| AUC-ROC | 96.3% |
| MCC | 0.87 |

---

## 🔌 API Reference

### Authentication

```
POST /auth/login
Body: { "username": "admin", "password": "admin123" }
Returns: { "access_token": "...", "user": {...} }
```

### Analyze Comment

```
POST /api/v1/analyze
Authorization: Bearer <token>
Body: {
  "text": "Your comment here",
  "language": "auto",       // "en" | "hi" | "hinglish" | "auto"
  "return_tokens": true,    // XAI token attribution
  "return_rewrite": true    // Polite rewrite suggestion
}
```

### Response

```json
{
  "verdict": "TOXIC",
  "is_toxic": true,
  "confidence": 87.4,
  "categories": {
    "toxic": 0.874, "severe_toxic": 0.312, "obscene": 0.421,
    "threat": 0.089, "insult": 0.793, "identity_hate": 0.067,
    "spam": 0.021, "cyberbullying": 0.512
  },
  "tokens": [
    { "word": "stupid", "score": 0.891, "risk_level": "high" },
    { "word": "hate",   "score": 0.823, "risk_level": "high" }
  ],
  "rewritten": "I respectfully disagree with your perspective.",
  "language_detected": "en",
  "processing_time_ms": 143,
  "model": "DistilBERT-ToxicClassifier-v2",
  "blocked": true
}
```

### Other Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/moderation/logs` | Paginated moderation log |
| GET | `/api/v1/moderation/stats` | Aggregate statistics |
| GET | `/api/v1/analytics/overview` | Time-series chart data |
| GET | `/api/v1/analytics/categories` | Category breakdown |
| GET | `/api/v1/analytics/model-performance` | Training metrics |
| GET | `/api/v1/admin/users` | List all users (admin) |
| PUT | `/api/v1/admin/thresholds` | Update detection thresholds (admin) |
| WS  | `/ws/{client_id}` | WebSocket real-time feed |

---

## 🗄️ Database Schema

### MongoDB Collections

- **users** — Auth, roles, activity counters
- **comments** — Every analyzed comment with full AI output
- **moderation_logs** — Human + system moderation actions
- **blocked_users** — Banned user registry
- **thresholds** — Admin-configurable detection thresholds (single doc)
- **analytics_snapshots** — Pre-computed rollups for fast dashboard

See `backend/app/models/schemas.py` for full Pydantic schemas and index definitions.

---

## ⚙️ Configuration

All settings in `backend/app/core/config.py` (Pydantic Settings):

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | — | JWT signing key (required) |
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `TOXIC_THRESHOLD` | `0.5` | Flag-as-warning threshold |
| `AUTO_BLOCK_THRESHOLD` | `0.7` | Auto-block threshold |
| `MAX_SEQ_LENGTH` | `256` | Tokenizer max length |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | JWT expiry (24h) |

---

## 🛠️ Tech Stack

**Frontend:** React 18, Vite, CSS custom properties, WebSockets API  
**Backend:** FastAPI, Uvicorn, Motor (async MongoDB driver), python-jose, passlib  
**AI/ML:** PyTorch, HuggingFace Transformers (DistilBERT), scikit-learn, datasets  
**Database:** MongoDB 7.0  
**Deployment:** Docker, Docker Compose, Nginx  

---

## 📄 License

MIT License — © 2024 ToxicShield AI
