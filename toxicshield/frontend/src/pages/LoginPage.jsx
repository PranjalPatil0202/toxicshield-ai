import { useState } from "react";
import { useAuth } from "../context/AuthContext";

/* ── password strength ───────────────────────────────────────────────────── */
function passwordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)                          score++;
  if (pw.length >= 12)                         score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw))  score++;
  if (/\d/.test(pw))                           score++;
  if (/[^A-Za-z0-9]/.test(pw))               score++;
  const map = [
    { label: "",          color: "" },
    { label: "Weak",      color: "#e24b4a" },
    { label: "Fair",      color: "#ef9f27" },
    { label: "Good",      color: "#63c132" },
    { label: "Strong",    color: "#1d9e75" },
    { label: "Very strong", color: "#0f6e56" },
  ];
  return { score, ...map[score] };
}

/* ── tiny inline field ───────────────────────────────────────────────────── */
function Field({ label, type = "text", value, onChange, error, hint, children }) {
  return (
    <div style={{ marginBottom: "1.1rem" }}>
      <label style={{
        display: "block", fontSize: "0.7rem",
        color: "var(--text-secondary)", letterSpacing: "0.1em",
        textTransform: "uppercase", marginBottom: "0.45rem",
      }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          className="form-input" type={type}
          value={value} onChange={e => onChange(e.target.value)}
          style={{ borderColor: error ? "var(--accent-red)" : undefined }}
        />
        {children}
      </div>
      {hint && !error && (
        <p style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "0.3rem" }}>{hint}</p>
      )}
      {error && (
        <p style={{ fontSize: "0.68rem", color: "var(--accent-red)", marginTop: "0.3rem" }}>⚠ {error}</p>
      )}
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────────────── */
export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode]     = useState("login"); // "login" | "register"
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPw, setShowPw]   = useState(false);

  /* login fields */
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  /* register fields */
  const [regUsername, setRegUsername]     = useState("");
  const [regEmail, setRegEmail]           = useState("");
  const [regPassword, setRegPassword]     = useState("");
  const [regConfirm, setRegConfirm]       = useState("");
  const [fieldErrors, setFieldErrors]     = useState({});

  const pwStr = passwordStrength(regPassword);

  /* ── client-side validation ── */
  function validateRegister() {
    const errs = {};
    if (regUsername.length < 3)
      errs.username = "Must be at least 3 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(regUsername))
      errs.username = "Letters, numbers, and underscores only";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(regEmail))
      errs.email = "Enter a valid email address";
    if (regPassword.length < 8)
      errs.password = "Must be at least 8 characters";
    if (!/\d/.test(regPassword))
      errs.password = "Must contain at least one number";
    if (regPassword !== regConfirm)
      errs.confirm = "Passwords do not match";
    return errs;
  }

  /* ── submit handlers ── */
  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
      setGlobalError("Please enter your username and password"); return;
    }
    setLoading(true); setGlobalError("");
    try {
      await login(loginUsername, loginPassword);
    } catch (e) {
      setGlobalError(e.message || "Login failed");
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setGlobalError(""); setSuccess("");
    const errs = validateRegister();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      await register(regUsername, regEmail, regPassword, regConfirm);
      setSuccess("Account created! Signing you in…");
    } catch (e) {
      setGlobalError(e.message || "Registration failed");
    } finally { setLoading(false); }
  };

  const handleKey = e => { if (e.key === "Enter") mode === "login" ? handleLogin() : handleRegister(); };

  const switchMode = m => {
    setMode(m); setGlobalError(""); setSuccess(""); setFieldErrors({});
  };

  /* ── render ── */
  return (
    <div className="login-page" onKeyDown={handleKey}>
      <div className="login-bg">
        <div className="login-grid" />
        <div className="login-glow" />
      </div>

      <div className="login-card" style={{ maxWidth: mode === "register" ? 460 : 420 }}>
        {/* Logo */}
        <div className="login-logo">
          <span className="login-shield">🛡️</span>
          <div className="login-title">Toxic<span>Shield</span> AI</div>
          <div className="login-sub">AI-Powered Content Moderation Platform</div>
        </div>

        {/* Mode Tabs */}
        <div style={{
          display: "flex", borderRadius: "8px", overflow: "hidden",
          border: "1px solid var(--border)", marginBottom: "1.5rem",
        }}>
          {[["login","🔐 Sign In"],["register","✨ Create Account"]].map(([m, label]) => (
            <button key={m} onClick={() => switchMode(m)} style={{
              flex: 1, padding: "0.6rem", border: "none", cursor: "pointer",
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.78rem",
              letterSpacing: "0.04em", transition: "all 0.2s",
              background: mode === m ? "var(--accent-cyan)" : "var(--bg-secondary)",
              color:      mode === m ? "var(--bg-primary)" : "var(--text-secondary)",
            }}>{label}</button>
          ))}
        </div>

        {/* Alerts */}
        {globalError && (
          <div className="login-error">{globalError}</div>
        )}
        {success && (
          <div style={{
            background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.25)",
            borderRadius: "8px", padding: "0.7rem 1rem", fontSize: "0.8rem",
            color: "var(--safe-green)", marginBottom: "1rem",
          }}>✅ {success}</div>
        )}

        {/* ── LOGIN FORM ── */}
        {mode === "login" && (
          <>
            <Field label="Username" value={loginUsername} onChange={setLoginUsername} />
            <Field label="Password" type={showPw ? "text" : "password"}
              value={loginPassword} onChange={setLoginPassword}>
              <button onClick={() => setShowPw(s => !s)} tabIndex={-1} style={{
                position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-dim)", fontSize: "0.8rem",
              }}>{showPw ? "Hide" : "Show"}</button>
            </Field>

            <button className="login-btn" onClick={handleLogin} disabled={loading}>
              {loading ? "Signing in…" : "🔐 Sign In"}
            </button>

            {/* Demo credentials */}
            <div className="demo-creds">
              <div className="demo-label">Quick Demo Access</div>
              <div className="demo-cards">
                {[
                  { role: "Admin", user: "admin", pw: "admin123" },
                  { role: "User",  user: "user1", pw: "user123"  },
                ].map(d => (
                  <div key={d.user} className="demo-card"
                    onClick={() => { setLoginUsername(d.user); setLoginPassword(d.pw); }}>
                    <div className="demo-card-role">{d.role} Role</div>
                    <div className="demo-card-user">{d.user} / {d.pw}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── REGISTER FORM ── */}
        {mode === "register" && (
          <>
            <Field label="Username" value={regUsername} onChange={setRegUsername}
              error={fieldErrors.username}
              hint="3–30 characters. Letters, numbers, underscores." />

            <Field label="Email address" type="email" value={regEmail} onChange={setRegEmail}
              error={fieldErrors.email} />

            <Field label="Password" type={showPw ? "text" : "password"}
              value={regPassword} onChange={setRegPassword}
              error={fieldErrors.password}
              hint="Minimum 8 characters with at least one number.">
              <button onClick={() => setShowPw(s => !s)} tabIndex={-1} style={{
                position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-dim)", fontSize: "0.8rem",
              }}>{showPw ? "Hide" : "Show"}</button>
            </Field>

            {/* Password strength bar */}
            {regPassword && (
              <div style={{ marginTop: "-0.6rem", marginBottom: "1rem" }}>
                <div style={{
                  height: "4px", borderRadius: "2px",
                  background: "var(--border)", overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: "2px",
                    width: `${(pwStr.score / 5) * 100}%`,
                    background: pwStr.color,
                    transition: "width 0.3s, background 0.3s",
                  }} />
                </div>
                {pwStr.label && (
                  <p style={{ fontSize: "0.68rem", color: pwStr.color, marginTop: "0.25rem" }}>
                    Strength: {pwStr.label}
                  </p>
                )}
              </div>
            )}

            <Field label="Confirm password" type={showPw ? "text" : "password"}
              value={regConfirm} onChange={setRegConfirm}
              error={fieldErrors.confirm} />

            {/* Requirements checklist */}
            <div style={{
              background: "var(--bg-secondary)", border: "1px solid var(--border)",
              borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.1rem",
            }}>
              <p style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Requirements
              </p>
              {[
                ["username-len",   regUsername.length >= 3,                 "Username ≥ 3 characters"],
                ["username-chars", /^[a-zA-Z0-9_]*$/.test(regUsername) && regUsername.length > 0, "Valid username characters"],
                ["email-valid",    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(regEmail), "Valid email address"],
                ["pw-len",         regPassword.length >= 8,                 "Password ≥ 8 characters"],
                ["pw-num",         /\d/.test(regPassword),                  "Contains a number"],
                ["pw-match",       regPassword && regPassword === regConfirm, "Passwords match"],
              ].map(([key, ok, text]) => (
                <div key={key} style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  fontSize: "0.75rem", marginBottom: "0.25rem",
                  color: ok ? "var(--safe-green)" : "var(--text-dim)",
                }}>
                  <span>{ok ? "✓" : "○"}</span> {text}
                </div>
              ))}
            </div>

            <button className="login-btn" onClick={handleRegister} disabled={loading}
              style={{ background: "var(--accent-green)", color: "var(--bg-primary)" }}>
              {loading ? "Creating account…" : "✨ Create Account"}
            </button>

            <p style={{
              fontSize: "0.72rem", color: "var(--text-dim)",
              textAlign: "center", marginTop: "1rem",
            }}>
              By registering you agree to our{" "}
              <span style={{ color: "var(--accent-cyan)", cursor: "pointer" }}>Terms of Service</span>
              {" "}and{" "}
              <span style={{ color: "var(--accent-cyan)", cursor: "pointer" }}>Privacy Policy</span>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
