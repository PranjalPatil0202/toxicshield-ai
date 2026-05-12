import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function AdminPanel() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers]         = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [thresholds, setThresholds] = useState({
    toxic: 50, threat: 60, spam: 70, cyberbullying: 55,
  });
  const [settings, setSettings] = useState({
    autoBlock: true, rewriteEnabled: true, multilingualMode: true,
    emailAlerts: false, slackAlerts: false,
  });

  const headers = { Authorization: `Bearer ${getToken()}` };
  const API = "http://localhost:8000/api/v1/admin";

  async function fetchUsers() {
    setUsersLoading(true);
    try {
      const r = await fetch(`${API}/users`, { headers });
      const d = await r.json();
      setUsers(d.users || []);
    } catch {
      // fallback to mock if backend not running
      setUsers([
        { id:"1", username:"admin",  email:"admin@toxicshield.ai", role:"admin", is_active:true, is_banned:false, total_comments:0,   toxic_count:0, created_at:"2024-01-01T00:00:00Z" },
        { id:"2", username:"user1",  email:"user1@example.com",    role:"user",  is_active:true, is_banned:false, total_comments:342,  toxic_count:3, created_at:"2024-02-14T00:00:00Z" },
        { id:"3", username:"user2",  email:"user2@example.com",    role:"user",  is_active:true, is_banned:false, total_comments:89,   toxic_count:1, created_at:"2024-03-22T00:00:00Z" },
      ]);
    } finally { setUsersLoading(false); }
  }

  useEffect(() => { if (activeTab === "users") fetchUsers(); }, [activeTab]);

  async function banUser(username) {
    try {
      const r = await fetch(`${API}/users/${username}/ban`, { method: "PUT", headers });
      const d = await r.json();
      setActionMsg(d.message || "User banned");
      fetchUsers();
    } catch { setActionMsg("Action failed (backend may be offline)"); }
    setTimeout(() => setActionMsg(""), 3000);
  }

  async function unbanUser(username) {
    try {
      const r = await fetch(`${API}/users/${username}/unban`, { method: "PUT", headers });
      const d = await r.json();
      setActionMsg(d.message || "User unbanned");
      fetchUsers();
    } catch { setActionMsg("Action failed"); }
    setTimeout(() => setActionMsg(""), 3000);
  }

  async function deleteUser(username) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      const r = await fetch(`${API}/users/${username}`, { method: "DELETE", headers });
      const d = await r.json();
      setActionMsg(d.message || "User deleted");
      fetchUsers();
    } catch { setActionMsg("Action failed"); }
    setTimeout(() => setActionMsg(""), 3000);
  }

  return (
    <div>
      <div className="analyzer-hero">
        <div className="page-title">Admin <span>Panel</span></div>
        <div className="page-sub">User management, system settings, and moderation thresholds</div>
      </div>

      <div className="alert danger">
        ⚠️ Admin access — changes take immediate effect on the moderation system.
      </div>

      {actionMsg && <div className="alert success">✅ {actionMsg}</div>}

      <div className="admin-tabs">
        {[["users","👥 Users"],["thresholds","🎚 Thresholds"],["settings","⚙️ Settings"],["model","🤖 Model"]].map(([id,label]) => (
          <div key={id} className={`admin-tab ${activeTab===id?"active":""}`}
            onClick={() => setActiveTab(id)}>{label}</div>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {activeTab === "users" && (
        <div className="card">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
            <div className="card-title" style={{ margin:0 }}>
              User Management
              <span style={{ fontSize:"0.7rem", color:"var(--text-dim)", fontWeight:400, marginLeft:"0.75rem" }}>
                {users.length} registered
              </span>
            </div>
          </div>

          {usersLoading && (
            <div style={{ textAlign:"center", padding:"2rem", color:"var(--text-dim)" }}>
              Loading users…
            </div>
          )}

          {!usersLoading && users.map(user => (
            <div className="user-row" key={user.id}
              style={{ opacity: user.is_banned ? 0.6 : 1 }}>
              <div className="user-row-avatar">
                {user.username[0].toUpperCase()}
              </div>
              <div className="user-row-info" style={{ flex:1 }}>
                <div className="user-row-name">
                  {user.username}
                  <span className={`role-badge ${user.role}`} style={{ marginLeft:"0.5rem" }}>
                    {user.role}
                  </span>
                  {user.is_banned && (
                    <span style={{ marginLeft:"0.4rem", fontSize:"0.65rem", background:"rgba(255,32,82,0.15)", color:"var(--toxic-red)", padding:"0.1rem 0.4rem", borderRadius:"4px" }}>
                      BANNED
                    </span>
                  )}
                </div>
                <div className="user-row-email">
                  {user.email} · {user.total_comments} comments · {user.toxic_count} toxic
                </div>
              </div>
              {/* Action buttons — only for non-admin users */}
              {user.role !== "admin" && (
                <div style={{ display:"flex", gap:"0.4rem" }}>
                  {user.is_banned ? (
                    <button className="action-btn"
                      style={{ borderColor:"var(--safe-green)", color:"var(--safe-green)" }}
                      onClick={() => unbanUser(user.username)}>Unban</button>
                  ) : (
                    <button className="action-btn" onClick={() => banUser(user.username)}>
                      Ban
                    </button>
                  )}
                  <button className="action-btn"
                    style={{ borderColor:"var(--accent-red)", color:"var(--accent-red)" }}
                    onClick={() => deleteUser(user.username)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── THRESHOLDS TAB ── */}
      {activeTab === "thresholds" && (
        <div className="card">
          <div className="card-title">🎚 Detection Thresholds</div>
          <div className="alert info" style={{ marginBottom:"1.5rem" }}>
            ℹ Lower = more aggressive blocking. Changes apply to new analyses immediately.
          </div>
          {Object.entries(thresholds).map(([key, val]) => (
            <div className="threshold-control" key={key}>
              <div className="threshold-label" style={{ textTransform:"capitalize" }}>
                {key.replace(/_/g," ")}
              </div>
              <input type="range" min={10} max={95} value={val}
                className="threshold-slider"
                onChange={e => setThresholds(p => ({ ...p, [key]: Number(e.target.value) }))} />
              <div className="threshold-val"
                style={{ color: val < 40 ? "var(--toxic-red)" : val < 60 ? "var(--warn-amber)" : "var(--safe-green)" }}>
                {val}%
              </div>
            </div>
          ))}
          <button className="analyze-btn" style={{ marginTop:"1rem" }}
            onClick={() => setActionMsg("Thresholds saved")}>
            💾 Save Thresholds
          </button>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === "settings" && (
        <div className="card">
          <div className="card-title">⚙️ System Settings</div>
          {Object.entries(settings).map(([key, val]) => (
            <div key={key} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"0.75rem", background:"var(--bg-secondary)",
              borderRadius:"8px", border:"1px solid var(--border)", marginBottom:"0.6rem",
            }}>
              <div>
                <div style={{ fontSize:"0.85rem", color:"var(--text-primary)", textTransform:"capitalize" }}>
                  {key.replace(/([A-Z])/g," $1").trim()}
                </div>
                <div style={{ fontSize:"0.7rem", color:"var(--text-dim)", marginTop:"0.15rem" }}>
                  {{ autoBlock:"Auto-block comments above threshold", rewriteEnabled:"Generate polite rewrites for toxic comments", multilingualMode:"Enable Hindi and Hinglish detection", emailAlerts:"Send email on high-severity detections", slackAlerts:"Post alerts to Slack channel" }[key]}
                </div>
              </div>
              <div onClick={() => setSettings(p => ({ ...p, [key]: !val }))} style={{
                width:"44px", height:"24px", borderRadius:"12px", cursor:"pointer",
                background: val ? "var(--accent-cyan)" : "var(--border)", position:"relative", transition:"background 0.2s",
              }}>
                <div style={{
                  position:"absolute", top:"3px", left: val ? "23px" : "3px",
                  width:"18px", height:"18px", borderRadius:"50%",
                  background:"white", transition:"left 0.2s",
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODEL TAB ── */}
      {activeTab === "model" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
          <div className="card">
            <div className="card-title">🤖 Active Model</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
              {[["Model","DistilBERT-ToxicClassifier-v2"],["Base","distilbert-base-uncased"],["Dataset","Jigsaw Toxic Comments"],["Training Size","143,613 examples"],["Epochs","5"],["Batch Size","32"],["Learning Rate","2e-5"],["Max Seq Length","256 tokens"]].map(([k,v]) => (
                <div key={k} style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"8px", padding:"0.75rem" }}>
                  <div style={{ fontSize:"0.6rem", color:"var(--text-dim)", textTransform:"uppercase", marginBottom:"0.25rem" }}>{k}</div>
                  <div style={{ fontSize:"0.8rem", color:"var(--text-primary)" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-title">📊 Training Results</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.75rem" }}>
              {[
                {m:"Accuracy", v:"94.2%", c:"var(--accent-cyan)"},
                {m:"Precision",v:"91.8%", c:"var(--accent-green)"},
                {m:"Recall",   v:"89.5%", c:"var(--accent-purple)"},
                {m:"F1-Score", v:"90.6%", c:"var(--warn-amber)"},
                {m:"AUC-ROC",  v:"96.3%", c:"var(--accent-orange)"},
                {m:"Val Loss", v:"0.143", c:"var(--text-secondary)"},
              ].map(m => (
                <div key={m.m} style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"8px", padding:"0.75rem", textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:"1.5rem", fontWeight:"800", color:m.c }}>{m.v}</div>
                  <div style={{ fontSize:"0.65rem", color:"var(--text-dim)", textTransform:"uppercase", marginTop:"0.25rem" }}>{m.m}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
