"""ToxicShield AI — API Tests. Run: pytest tests/ -v"""
import pytest
from fastapi.testclient import TestClient
import sys; sys.path.insert(0, "..")
from main import app

client = TestClient(app)

def get_token(username="user1", password="user123"):
    r = client.post("/auth/login", json={"username": username, "password": password})
    return r.json().get("access_token", "")

# ── root / health ─────────────────────────────────────────────────────────
def test_root():
    r = client.get("/"); assert r.status_code == 200
    assert r.json()["service"] == "ToxicShield AI"

def test_health():
    r = client.get("/health"); assert r.status_code == 200

# ── login ─────────────────────────────────────────────────────────────────
def test_login_success():
    r = client.post("/auth/login", json={"username":"admin","password":"admin123"})
    assert r.status_code == 200
    d = r.json(); assert "access_token" in d; assert d["user"]["role"] == "admin"

def test_login_wrong_password():
    r = client.post("/auth/login", json={"username":"admin","password":"wrong"})
    assert r.status_code == 401

def test_login_unknown_user():
    r = client.post("/auth/login", json={"username":"ghost","password":"x"})
    assert r.status_code == 401

# ── registration ──────────────────────────────────────────────────────────
def test_register_success():
    r = client.post("/auth/register", json={
        "username": "newuser99", "email": "new99@example.com",
        "password": "SecurePass1", "confirm_password": "SecurePass1",
    })
    assert r.status_code == 201
    d = r.json()
    assert "access_token" in d
    assert d["user"]["username"] == "newuser99"
    assert d["user"]["role"] == "user"
    assert "hashed_password" not in d["user"]

def test_register_duplicate_username():
    client.post("/auth/register", json={
        "username": "dupuser", "email": "dup1@example.com",
        "password": "Pass1234", "confirm_password": "Pass1234",
    })
    r = client.post("/auth/register", json={
        "username": "dupuser", "email": "dup2@example.com",
        "password": "Pass1234", "confirm_password": "Pass1234",
    })
    assert r.status_code == 409
    assert "taken" in r.json()["detail"].lower()

def test_register_duplicate_email():
    client.post("/auth/register", json={
        "username": "emailtest1", "email": "shared@example.com",
        "password": "Pass1234", "confirm_password": "Pass1234",
    })
    r = client.post("/auth/register", json={
        "username": "emailtest2", "email": "shared@example.com",
        "password": "Pass1234", "confirm_password": "Pass1234",
    })
    assert r.status_code == 409
    assert "email" in r.json()["detail"].lower()

def test_register_password_mismatch():
    r = client.post("/auth/register", json={
        "username": "mismatch", "email": "mm@example.com",
        "password": "Pass1234", "confirm_password": "Pass5678",
    })
    assert r.status_code == 422

def test_register_weak_password():
    r = client.post("/auth/register", json={
        "username": "weakpw", "email": "weak@example.com",
        "password": "abc", "confirm_password": "abc",
    })
    assert r.status_code == 422

def test_register_invalid_email():
    r = client.post("/auth/register", json={
        "username": "bademail", "email": "not-an-email",
        "password": "Pass1234", "confirm_password": "Pass1234",
    })
    assert r.status_code == 422

def test_register_username_too_short():
    r = client.post("/auth/register", json={
        "username": "ab", "email": "short@example.com",
        "password": "Pass1234", "confirm_password": "Pass1234",
    })
    assert r.status_code == 422

def test_registered_user_can_login():
    client.post("/auth/register", json={
        "username": "loginafter", "email": "la@example.com",
        "password": "LoginPass9", "confirm_password": "LoginPass9",
    })
    r = client.post("/auth/login", json={"username":"loginafter","password":"LoginPass9"})
    assert r.status_code == 200
    assert "access_token" in r.json()

# ── auth/me ───────────────────────────────────────────────────────────────
def test_me_endpoint():
    token = get_token()
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert "username" in r.json()
    assert "hashed_password" not in r.json()

# ── analysis ──────────────────────────────────────────────────────────────
def test_analyze_safe():
    token = get_token()
    r = client.post("/api/v1/analyze",
        json={"text":"Great work on this project!"},
        headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    d = r.json()
    assert d["verdict"] in ("SAFE","WARNING","TOXIC")
    assert 0 <= d["confidence"] <= 100

def test_analyze_toxic():
    token = get_token()
    r = client.post("/api/v1/analyze",
        json={"text":"I hate you, you are so stupid and ugly!"},
        headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200

def test_analyze_requires_auth():
    r = client.post("/api/v1/analyze", json={"text":"hello"})
    assert r.status_code == 401

def test_analyze_empty_text():
    token = get_token()
    r = client.post("/api/v1/analyze",
        json={"text":""},
        headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 422

# ── admin ─────────────────────────────────────────────────────────────────
def test_admin_forbidden_for_user():
    token = get_token("user1","user123")
    r = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403

def test_admin_users_as_admin():
    token = get_token("admin","admin123")
    r = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert "users" in r.json()

def test_registered_user_appears_in_admin_list():
    # Register
    client.post("/auth/register", json={
        "username":"adminlisttest","email":"alt@example.com",
        "password":"ListTest9","confirm_password":"ListTest9",
    })
    token = get_token("admin","admin123")
    r = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token}"})
    usernames = [u["username"] for u in r.json()["users"]]
    assert "adminlisttest" in usernames

# ── analytics ─────────────────────────────────────────────────────────────
def test_analytics_overview():
    token = get_token()
    r = client.get("/api/v1/analytics/overview", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert "total" in r.json()
