import { useState } from "react";

const WEEKLY_DATA = [
  {day:"Mon",toxic:45,safe:312,blocked:23},
  {day:"Tue",toxic:62,safe:287,blocked:31},
  {day:"Wed",toxic:38,safe:401,blocked:19},
  {day:"Thu",toxic:89,safe:356,blocked:44},
  {day:"Fri",toxic:73,safe:298,blocked:37},
  {day:"Sat",toxic:51,safe:189,blocked:26},
  {day:"Sun",toxic:34,safe:201,blocked:17},
];

const CATEGORY_BREAKDOWN = [
  {name:"Toxic",count:312,pct:38,color:"var(--toxic-red)"},
  {name:"Insult",count:198,pct:24,color:"var(--accent-orange)"},
  {name:"Obscene",count:143,pct:17,color:"var(--accent-purple)"},
  {name:"Threat",count:98,pct:12,color:"var(--warn-amber)"},
  {name:"Identity Hate",count:67,pct:8,color:"var(--accent-cyan)"},
  {name:"Spam",count:28,pct:3,color:"var(--text-dim)"},
];

const LANG_DIST = [
  {lang:"English",pct:62,color:"var(--accent-cyan)"},
  {lang:"Hinglish",pct:24,color:"var(--accent-purple)"},
  {lang:"Hindi",pct:14,color:"var(--accent-orange)"},
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("7d");
  const maxVal = Math.max(...WEEKLY_DATA.map(d => d.toxic + d.safe));

  return (
    <div>
      <div className="analyzer-hero">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div className="page-title">Analytics <span>Insights</span></div>
            <div className="page-sub">Toxicity trends, category breakdown, and model metrics</div>
          </div>
          <div style={{display:"flex",gap:"0.5rem"}}>
            {["24h","7d","30d"].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding:"0.4rem 0.9rem", border:"1px solid", borderRadius:"6px",
                  fontFamily:"var(--font-mono)", fontSize:"0.75rem", cursor:"pointer",
                  background: period === p ? "var(--accent-cyan)" : "var(--bg-secondary)",
                  borderColor: period === p ? "var(--accent-cyan)" : "var(--border)",
                  color: period === p ? "var(--bg-primary)" : "var(--text-secondary)",
                }}
              >{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{marginBottom:"1.5rem"}}>
        {[
          {icon:"📊",val:"8,234",label:"Total This Week",sub:"+12% vs last week",color:"blue"},
          {icon:"🚨",val:"846",label:"Toxic Flagged",sub:"10.3% toxicity rate",color:"red"},
          {icon:"🔒",val:"397",label:"Auto Blocked",sub:"47% of toxic content",color:"orange"},
          {icon:"⚡",val:"142ms",label:"Avg Latency",sub:"-8ms improvement",color:"green"},
        ].map((c,i) => (
          <div className={`stat-card ${c.color}`} key={i}>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-value">{c.val}</div>
            <div className="stat-label">{c.label}</div>
            <div style={{fontSize:"0.7rem",color:"var(--text-dim)",marginTop:"0.3rem"}}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="analytics-grid">
        {/* Weekly Chart */}
        <div className="card">
          <div className="card-title">📈 Weekly Comment Volume</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:"0.6rem",height:"160px",paddingTop:"1rem"}}>
            {WEEKLY_DATA.map((d, i) => {
              const totalH = ((d.toxic + d.safe) / maxVal) * 140;
              const toxicH = (d.toxic / (d.toxic + d.safe)) * totalH;
              const safeH = totalH - toxicH;
              return (
                <div key={i} className="bar-wrap">
                  <div style={{display:"flex",flexDirection:"column",width:"100%",alignItems:"center",justifyContent:"flex-end",height:"140px",gap:"2px"}}>
                    <div style={{width:"100%",background:"var(--toxic-red)",borderRadius:"3px 3px 0 0",height:`${toxicH}px`,opacity:0.8}} />
                    <div style={{width:"100%",background:"var(--accent-cyan)",height:`${safeH}px`,opacity:0.6}} />
                  </div>
                  <div className="bar-lbl">{d.day}</div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:"1rem",marginTop:"0.75rem"}}>
            {[{c:"var(--accent-cyan)",l:"Safe"},{c:"var(--toxic-red)",l:"Toxic"}].map(i => (
              <div key={i.l} style={{display:"flex",alignItems:"center",gap:"0.4rem",fontSize:"0.7rem",color:"var(--text-secondary)"}}>
                <div style={{width:10,height:10,borderRadius:2,background:i.c}} />
                {i.l}
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <div className="card-title">🏷 Category Breakdown</div>
          {CATEGORY_BREAKDOWN.map(cat => (
            <div key={cat.name} style={{marginBottom:"0.75rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.3rem"}}>
                <span style={{fontSize:"0.75rem",color:"var(--text-secondary)"}}>{cat.name}</span>
                <span style={{fontSize:"0.75rem",fontWeight:"700",color:cat.color}}>{cat.count} ({cat.pct}%)</span>
              </div>
              <div className="cat-bar">
                <div className="cat-fill" style={{width:`${cat.pct}%`,background:cat.color}} />
              </div>
            </div>
          ))}
        </div>

        {/* Language Distribution */}
        <div className="card">
          <div className="card-title">🌐 Language Distribution</div>
          <div style={{padding:"1rem 0"}}>
            {LANG_DIST.map(lang => (
              <div key={lang.lang} style={{marginBottom:"1rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.5rem"}}>
                  <span style={{fontSize:"0.8rem",color:"var(--text-primary)"}}>{lang.lang}</span>
                  <span style={{fontSize:"0.85rem",fontWeight:"700",fontFamily:"var(--font-display)",color:lang.color}}>{lang.pct}%</span>
                </div>
                <div style={{height:"8px",background:"var(--border)",borderRadius:"4px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${lang.pct}%`,background:lang.color,borderRadius:"4px",transition:"width 1s"}} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Metrics */}
        <div className="card">
          <div className="card-title">🤖 Model Performance Metrics</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginTop:"0.5rem"}}>
            {[
              {m:"Accuracy",v:94.2,c:"var(--accent-cyan)"},
              {m:"Precision",v:91.8,c:"var(--accent-green)"},
              {m:"Recall",v:89.5,c:"var(--accent-purple)"},
              {m:"F1-Score",v:90.6,c:"var(--warn-amber)"},
              {m:"AUC-ROC",v:96.3,c:"var(--accent-orange)"},
              {m:"MCC",v:0.87,c:"var(--text-primary)"},
            ].map(metric => (
              <div key={metric.m} style={{background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"8px",padding:"0.75rem",textAlign:"center"}}>
                <div style={{fontFamily:"var(--font-display)",fontSize:"1.4rem",fontWeight:"800",color:metric.c}}>
                  {metric.v > 1 ? `${metric.v}%` : metric.v}
                </div>
                <div style={{fontSize:"0.65rem",color:"var(--text-dim)",textTransform:"uppercase",marginTop:"0.2rem"}}>{metric.m}</div>
              </div>
            ))}
          </div>
          <div className="alert info" style={{marginTop:"1rem"}}>
            ℹ Trained on Jigsaw Toxic Comment Dataset — 159,571 examples
          </div>
        </div>
      </div>
    </div>
  );
}
