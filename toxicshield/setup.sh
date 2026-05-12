#!/usr/bin/env bash
# ToxicShield AI — One-Command Setup Script
set -e

echo ""
echo "🛡️  ToxicShield AI — Setup"
echo "================================"

# ── Check prerequisites ───────────────────────────────
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3.11+ required"; exit 1; }
command -v node    >/dev/null 2>&1 || { echo "❌ Node.js 20+ required"; exit 1; }
command -v npm     >/dev/null 2>&1 || { echo "❌ npm required"; exit 1; }

# ── Environment file ─────────────────────────────────
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .env created (edit SECRET_KEY and MONGODB_URL)"
fi

# ── Backend ───────────────────────────────────────────
echo ""
echo "📦 Setting up backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
echo "✅ Backend dependencies installed"
cd ..

# ── Frontend ──────────────────────────────────────────
echo ""
echo "📦 Setting up frontend..."
cd frontend
npm install --silent
echo "✅ Frontend dependencies installed"
cd ..

echo ""
echo "================================"
echo "✅ Setup complete!"
echo ""
echo "Start backend:   cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "Start frontend:  cd frontend && npm run dev"
echo ""
echo "Demo credentials:"
echo "  Admin: admin / admin123"
echo "  User:  user1 / user123"
echo ""
