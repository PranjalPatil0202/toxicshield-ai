import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = ["toxic", "severe_toxic", "obscene", "threat", "insult", "identity_hate", "spam", "cyberbullying"];

const getCatColor = (score) => {
  if (score > 0.7) return "#ff2052";
  if (score > 0.4) return "#ffab00";
  return "#00e676";
};

const getTokenRisk = (score) => {
  if (score > 0.7) return "high-risk";
  if (score > 0.35) return "med-risk";
  if (score < 0.1) return "low-risk";
  return "neutral";
};

// Simulates AI analysis (replace with real API call in production)
async function analyzeComment(text, lang, token) {
  await new Promise(r => setTimeout(r, 900 + Math.random() * 600));

  const toxicWords = ["hate", "kill", "stupid", "idiot", "die", "ugly", "loser", "shut up", "bhad", "pagal", "saala"];
  const lowerText = text.toLowerCase();
  const hasToxic = toxicWords.some(w => lowerText.includes(w));
  const toxicScore = hasToxic ? 0.65 + Math.random() * 0.3 : Math.random() * 0.2;

  const categories = {
    toxic: toxicScore,
    severe_toxic: toxicScore > 0.8 ? toxicScore * 0.7 : Math.random() * 0.15,
    obscene: hasToxic ? Math.random() * 0.4 + 0.1 : Math.random() * 0.1,
    threat: lowerText.includes("kill") || lowerText.includes("hurt") ? 0.6 + Math.random() * 0.3 : Math.random() * 0.1,
    insult: hasToxic ? 0.4 + Math.random() * 0.4 : Math.random() * 0.2,
    identity_hate: Math.random() * (hasToxic ? 0.4 : 0.1),
    spam: text.split(" ").length < 3 ? Math.random() * 0.3 : Math.random() * 0.1,
    cyberbullying: hasToxic ? Math.random() * 0.5 + 0.1 : Math.random() * 0.1,
  };

  const words = text.split(/\s+/);
  const tokens = words.map(word => ({
    word,
    score: toxicWords.some(tw => word.toLowerCase().includes(tw))
      ? 0.6 + Math.random() * 0.35
      : Math.random() * 0.25,
  }));

  const isToxic = toxicScore > 0.5;
  const verdict = toxicScore > 0.7 ? "TOXIC" : toxicScore > 0.4 ? "WARNING" : "SAFE";

  const rewrites = [
    "I disagree with your perspective on this matter.",
    "I think there might be a misunderstanding here.",
    "Could we discuss this more constructively?",
    "I have a different opinion about this.",
    "Let me share my thoughts in a respectful way.",
  ];

  return {
    verdict,
    confidence: +(toxicScore * 100).toFixed(1),
    is_toxic: isToxic,
    categories,
    tokens,
    rewritten: isToxic ? rewrites[Math.floor(Math.random() * rewrites.length)] : null,
    language_detected: lang === "auto" ? ["en", "hi", "hinglish"][Math.floor(Math.random() * 3)] : lang,
    processing_time_ms: Math.floor(850 + Math.random() * 400),
    model: "DistilBERT-ToxicClassifier-v2",
    blocked: toxicScore > 0.7,
  };
}

export default function CommentAnalyzer() {
  const { getToken } = useAuth();
  const [text, setText] = useState("");
  const [lang, setLang] = useState("auto");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true); setResult(null);
    try {
      const data = await analyzeComment(text, lang, getToken());
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result?.rewritten || "");
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const verdictClass = result?.verdict === "TOXIC" ? "toxic" : result?.verdict === "WARNING" ? "warning" : "safe";
  const verdictIcon = result?.verdict === "TOXIC" ? "🚫" : result?.verdict === "WARNING" ? "⚠️" : "✅";

  return (
    <div>
      <div className="analyzer-hero">
        <div className="page-title">Comment <span>Analyzer</span></div>
        <div className="page-sub">Real-time AI toxicity detection with explainable results</div>
      </div>

      <div className="analyzer-layout">
        {/* Input Panel */}
        <div>
          <div className="card">
            <div className="card-title">📝 Input Comment</div>
            <textarea
              ref={textareaRef}
              className="comment-input-area"
              placeholder="Type or paste a comment to analyze...&#10;&#10;Supports English, Hindi, and Hinglish"
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={2000}
            />
            <div className="input-controls">
              <span className="char-count">{text.length}/2000 chars</span>
              <select className="lang-select" value={lang} onChange={e => setLang(e.target.value)}>
                <option value="auto">🌐 Auto Detect</option>
                <option value="en">🇬🇧 English</option>
                <option value="hi">🇮🇳 Hindi</option>
                <option value="hinglish">🔀 Hinglish</option>
              </select>
              <button className="analyze-btn" onClick={handleAnalyze} disabled={loading || !text.trim()}>
                {loading ? <><div className="spinner" /> Analyzing...</> : <>🔍 Analyze</>}
              </button>
            </div>
          </div>

          {/* Quick test samples */}
          <div className="card" style={{marginTop:"1rem"}}>
            <div className="card-title">⚡ Quick Test Samples</div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
              {[
                { text: "You are so stupid and I hate you!", label: "Insult", type: "toxic" },
                { text: "Great work on the project today! 👏", label: "Safe", type: "safe" },
                { text: "Ek dum bakwaas kaam hai yeh. Pagal ho kya?", label: "Hinglish", type: "warning" },
                { text: "I will find you and make you pay for this!", label: "Threat", type: "toxic" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="feed-item"
                  style={{cursor:"pointer"}}
                  onClick={() => setText(s.text)}
                >
                  <div className={`feed-status ${s.type}`} />
                  <div className="feed-content">
                    <div className="feed-text">{s.text}</div>
                    <div className="feed-meta">Sample · {s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="result-panel">
          {!result && !loading && (
            <div className="card empty-state">
              <div className="empty-icon">🛡️</div>
              <div className="empty-text">Submit a comment to see AI analysis results</div>
            </div>
          )}

          {loading && (
            <div className="card" style={{textAlign:"center",padding:"3rem"}}>
              <div style={{fontSize:"2rem",marginBottom:"1rem"}}>🤖</div>
              <div style={{color:"var(--text-secondary)",fontSize:"0.85rem"}}>Analyzing with DistilBERT model...</div>
              <div className="loading-bar" style={{margin:"1rem auto 0"}}><div className="loading-fill" /></div>
            </div>
          )}

          {result && (
            <>
              {/* Verdict Banner */}
              <div className={`verdict-banner ${verdictClass}`}>
                <div className="verdict-icon">{verdictIcon}</div>
                <div>
                  <div className="verdict-label">{result.verdict}</div>
                  <div className="verdict-meta">
                    {result.blocked ? "🔒 Auto-blocked" : "✓ Processed"} ·
                    {result.language_detected?.toUpperCase()} ·
                    {result.processing_time_ms}ms
                  </div>
                </div>
                <div className="verdict-confidence">
                  <div className="conf-value">{result.confidence}%</div>
                  <div className="conf-label">Confidence</div>
                </div>
              </div>

              {/* Category Scores */}
              <div className="card">
                <div className="card-title">📊 Category Scores</div>
                <div className="categories-grid">
                  {Object.entries(result.categories).map(([cat, score]) => (
                    <div className="category-item" key={cat}>
                      <div className="cat-header">
                        <span className="cat-name">{cat.replace(/_/g," ")}</span>
                        <span className="cat-score" style={{color: getCatColor(score)}}>
                          {(score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="cat-bar">
                        <div className="cat-fill" style={{
                          width: `${score * 100}%`,
                          background: getCatColor(score),
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* XAI - Token Highlights */}
              <div className="card">
                <div className="card-title">🧠 Explainable AI — Token Attribution</div>
                <div className="xai-tokens">
                  {result.tokens.map((t, i) => (
                    <span key={i} className={`xai-token ${getTokenRisk(t.score)}`} title={`Risk: ${(t.score*100).toFixed(1)}%`}>
                      {t.word}
                    </span>
                  ))}
                </div>
                <div style={{marginTop:"0.75rem",fontSize:"0.7rem",color:"var(--text-dim)"}}>
                  🔴 High risk &nbsp; 🟡 Medium risk &nbsp; 🟢 Low risk &nbsp; ⬜ Neutral
                </div>
              </div>

              {/* Polite Rewrite */}
              {result.rewritten && (
                <div className="rewrite-box">
                  <div className="rewrite-label">✨ AI-Rewritten (Polite Version)</div>
                  <div className="rewrite-text">{result.rewritten}</div>
                  <button className="copy-btn" onClick={handleCopy}>
                    {copied ? "✅ Copied!" : "📋 Copy Rewrite"}
                  </button>
                </div>
              )}

              {/* Model Info */}
              <div className="card">
                <div className="card-title">ℹ Model Info</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
                  {[
                    ["Model", result.model],
                    ["Language", result.language_detected?.toUpperCase()],
                    ["Latency", `${result.processing_time_ms}ms`],
                    ["Action", result.blocked ? "BLOCKED" : "ALLOWED"],
                  ].map(([k, v]) => (
                    <div key={k} style={{background:"var(--bg-secondary)",borderRadius:"6px",padding:"0.6rem"}}>
                      <div style={{fontSize:"0.6rem",color:"var(--text-dim)",textTransform:"uppercase",marginBottom:"0.25rem"}}>{k}</div>
                      <div style={{fontSize:"0.8rem",color:"var(--text-primary)"}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
