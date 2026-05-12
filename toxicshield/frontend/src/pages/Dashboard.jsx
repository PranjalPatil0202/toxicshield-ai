import { useState, useEffect, useRef } from "react";

const SAMPLE_COMMENTS = [
  { text: "This is a great article, very informative!", verdict: "safe", score: 3.2, user: "user_289", lang: "en" },
  { text: "You are an absolute idiot for writing this garbage", verdict: "toxic", score: 87.4, user: "user_041", lang: "en" },
  { text: "Accha hai yeh content, mujhe pasand aaya", verdict: "safe", score: 5.1, user: "user_712", lang: "hi" },
  { text: "I'll make sure you regret posting this", verdict: "toxic", score: 92.1, user: "user_019", lang: "en" },
  { text: "Interesting perspective on the topic", verdict: "safe", score: 2.8, user: "user_445", lang: "en" },
  { text: "Kya bakwaas likh rakhe ho saale!", verdict: "warning", score: 54.3, user: "user_331", lang: "hinglish" },
  { text: "Thanks for sharing this amazing insight!", verdict: "safe", score: 1.9, user: "user_890", lang: "en" },
  { text: "Shut up you disgusting creature", verdict: "toxic", score: 95.7, user: "user_202", lang: "en" },
  { text: "Could you please clarify your point?", verdict: "safe", score: 4.2, user: "user_667", lang: "en" },
  { text: "You don't deserve to exist on this platform", verdict: "toxic", score: 88.9, user: "user_115", lang: "en" },
];

function StatCard({ icon, value, label, delta, colorClass }) {
  return (
    <div className={`stat-card ${colorClass}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {delta && <div className={`stat-delta ${delta.startsWith("+") ? "up" : "down"}`}>{delta} vs last hour</div>}
    </div>
  );
}

function BarChart({ data, colors }) {
  const max = Math.max(...data.map(d => d.val));
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div className="bar-wrap" key={i}>
          <div className="bar" style={{height:`${(d.val/max)*100}%`, background: colors[i % colors.length]}} />
          <div className="bar-lbl">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [feed, setFeed] = useState(SAMPLE_COMMENTS.slice(0, 5));
  const [stats, setStats] = useState({ total: 1247, toxic: 183, blocked: 91, safe: 973 });
  const [tick, setTick] = useState(0);
  const feedRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = SAMPLE_COMMENTS[Math.floor(Math.random() * SAMPLE_COMMENTS.length)];
      setFeed(prev => [next, ...prev.slice(0, 14)]);
      setStats(prev => ({
        total: prev.total + 1,
        toxic: next.verdict === "toxic" ? prev.toxic + 1 : prev.toxic,
        blocked: next.score > 70 ? prev.blocked + 1 : prev.blocked,
        safe: next.verdict === "safe" ? prev.safe + 1 : prev.safe,
      }));
      setTick(t => t + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const hourlyData = [
    {label:"00",val:42},{label:"02",val:28},{label:"04",val:19},{label:"06",val:35},
    {label:"08",val:67},{label:"10",val:89},{label:"12",val:112},{label:"14",val:98},
    {label:"16",val:134},{label:"18",val:156},{label:"20",val:143},{label:"22",val:87},
  ];

  const toxicRate = ((stats.toxic / stats.total) * 100).toFixed(1);

  return (
    <div>
      <div className="analyzer-hero">
        <div className="page-title">Live <span>Dashboard</span></div>
        <div className="page-sub">Real-time content moderation monitoring</div>
      </div>

      <div className="stats-grid">
        <StatCard icon="📨" value={stats.total.toLocaleString()} label="Total Analyzed" delta="+47" colorClass="blue" />
        <StatCard icon="🚫" value={stats.toxic.toLocaleString()} label="Toxic Detected" delta={`+${Math.floor(Math.random()*5)+1}`} colorClass="red" />
        <StatCard icon="🔒" value={stats.blocked.toLocaleString()} label="Auto Blocked" delta={`+${Math.floor(Math.random()*3)+1}`} colorClass="orange" />
        <StatCard icon="✅" value={stats.safe.toLocaleString()} label="Clean Comments" delta={`+${Math.floor(Math.random()*8)+5}`} colorClass="green" />
      </div>

      <div className="charts-grid">
        {/* Live Feed */}
        <div className="card">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
            <div className="card-title" style={{margin:0}}>⚡ Live Moderation Feed</div>
            <div className="ws-indicator">
              <div className="ws-dot connected" />
              <span style={{fontSize:"0.7rem",color:"var(--text-secondary)"}}>Live</span>
            </div>
          </div>
          <div className="feed-list" ref={feedRef}>
            {feed.map((item, i) => (
              <div className="feed-item" key={i}>
                <div className={`feed-status ${item.verdict}`} />
                <div className="feed-content">
                  <div className="feed-text">{item.text}</div>
                  <div className="feed-meta">{item.user} · {item.lang?.toUpperCase()} · just now</div>
                </div>
                <div className={`feed-score ${item.verdict}`}>{item.score.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar stats */}
        <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
          <div className="card">
            <div className="card-title">📊 Hourly Volume</div>
            <BarChart
              data={hourlyData}
              colors={["var(--accent-cyan)","var(--accent-purple)","var(--accent-cyan)"]}
            />
          </div>

          <div className="card">
            <div className="card-title">🎯 Toxicity Rate</div>
            <div style={{textAlign:"center",padding:"1rem 0"}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:"3rem",fontWeight:"800",color:toxicRate > 20 ? "var(--toxic-red)" : "var(--accent-cyan)"}}>
                {toxicRate}%
              </div>
              <div style={{fontSize:"0.75rem",color:"var(--text-secondary)",marginTop:"0.25rem"}}>of all comments are toxic</div>
            </div>
            <div className="donut-legend">
              {[
                {label:"Safe",val:`${((stats.safe/stats.total)*100).toFixed(0)}%`,color:"var(--safe-green)"},
                {label:"Toxic",val:`${((stats.toxic/stats.total)*100).toFixed(0)}%`,color:"var(--toxic-red)"},
                {label:"Blocked",val:`${((stats.blocked/stats.total)*100).toFixed(0)}%`,color:"var(--accent-purple)"},
              ].map(item => (
                <div className="legend-item" key={item.label}>
                  <div className="legend-dot" style={{background:item.color}} />
                  <span className="legend-label">{item.label}</span>
                  <span className="legend-val">{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">🤖 Model Performance</div>
            {[
              {metric:"Accuracy",val:"94.2%",color:"var(--accent-cyan)"},
              {metric:"Precision",val:"91.8%",color:"var(--accent-green)"},
              {metric:"Recall",val:"89.5%",color:"var(--accent-purple)"},
              {metric:"F1-Score",val:"90.6%",color:"var(--warn-amber)"},
            ].map(m => (
              <div key={m.metric} style={{display:"flex",justifyContent:"space-between",padding:"0.4rem 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontSize:"0.8rem",color:"var(--text-secondary)"}}>{m.metric}</span>
                <span style={{fontSize:"0.85rem",fontWeight:"700",fontFamily:"var(--font-display)",color:m.color}}>{m.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
