import { useState } from "react";

const MOCK_LOGS = Array.from({length: 50}, (_, i) => {
  const verdicts = ["safe","toxic","warning","blocked"];
  const categories = ["toxic","insult","threat","obscene","spam","identity_hate","cyberbullying"];
  const langs = ["en","hi","hinglish"];
  const users = ["user_"+String(Math.floor(Math.random()*999)).padStart(3,"0")];
  const verdict = verdicts[Math.floor(Math.random() * verdicts.length)];
  const texts = [
    "You are such an idiot, I hate you",
    "Great work on this project!",
    "Kya bakwaas hai yeh",
    "I will make you regret this",
    "Thanks for sharing this insight",
    "Shut up you disgusting person",
    "Really appreciated this article",
    "Go away nobody likes you here",
  ];
  return {
    id: `LOG-${String(10000+i).slice(1)}`,
    text: texts[i % texts.length],
    verdict,
    score: verdict === "safe" ? Math.random()*20 : 45 + Math.random()*50,
    category: verdict === "safe" ? "-" : categories[Math.floor(Math.random()*categories.length)],
    user: `user_${String(Math.floor(Math.random()*900)+100)}`,
    lang: langs[Math.floor(Math.random()*3)],
    time: new Date(Date.now() - i * 180000).toLocaleString(),
    action: verdict === "blocked" || verdict === "toxic" ? "blocked" : "allowed",
  };
});

export default function ModerationLogs() {
  const [search, setSearch] = useState("");
  const [filterVerdict, setFilterVerdict] = useState("all");
  const [filterLang, setFilterLang] = useState("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const filtered = MOCK_LOGS.filter(log => {
    const matchSearch = search === "" || log.text.toLowerCase().includes(search.toLowerCase()) || log.user.includes(search);
    const matchVerdict = filterVerdict === "all" || log.verdict === filterVerdict;
    const matchLang = filterLang === "all" || log.lang === filterLang;
    return matchSearch && matchVerdict && matchLang;
  });

  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <div>
      <div className="analyzer-hero">
        <div className="page-title">Moderation <span>Logs</span></div>
        <div className="page-sub">Complete audit trail of all analyzed comments</div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <input
            className="filter-input"
            placeholder="🔍 Search comments, users..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="filter-select" value={filterVerdict} onChange={e => { setFilterVerdict(e.target.value); setPage(1); }}>
            <option value="all">All Verdicts</option>
            <option value="safe">Safe</option>
            <option value="toxic">Toxic</option>
            <option value="warning">Warning</option>
            <option value="blocked">Blocked</option>
          </select>
          <select className="filter-select" value={filterLang} onChange={e => { setFilterLang(e.target.value); setPage(1); }}>
            <option value="all">All Languages</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="hinglish">Hinglish</option>
          </select>
        </div>

        <div style={{overflowX:"auto"}}>
          <table className="logs-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Comment</th>
                <th>Verdict</th>
                <th>Score</th>
                <th>Category</th>
                <th>User</th>
                <th>Lang</th>
                <th>Action</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(log => (
                <tr key={log.id}>
                  <td style={{color:"var(--text-dim)",fontFamily:"var(--font-mono)"}}>{log.id}</td>
                  <td style={{maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--text-primary)"}}>
                    {log.text}
                  </td>
                  <td><span className={`tag ${log.verdict}`}>{log.verdict}</span></td>
                  <td style={{
                    fontFamily:"var(--font-display)",fontWeight:"700",
                    color: log.score > 70 ? "var(--toxic-red)" : log.score > 40 ? "var(--warn-amber)" : "var(--safe-green)"
                  }}>
                    {log.score.toFixed(1)}%
                  </td>
                  <td><span style={{fontSize:"0.75rem",color:"var(--text-secondary)"}}>{log.category}</span></td>
                  <td style={{fontFamily:"var(--font-mono)",fontSize:"0.75rem"}}>{log.user}</td>
                  <td><span style={{fontSize:"0.7rem",color:"var(--accent-cyan)",textTransform:"uppercase"}}>{log.lang}</span></td>
                  <td>
                    <span className={`tag ${log.action === "blocked" ? "blocked" : "safe"}`}>
                      {log.action === "blocked" ? "🔒 blocked" : "✓ allowed"}
                    </span>
                  </td>
                  <td style={{fontSize:"0.7rem",color:"var(--text-dim)",whiteSpace:"nowrap"}}>{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:"1rem"}}>
          <div style={{fontSize:"0.75rem",color:"var(--text-dim)"}}>{filtered.length} entries found</div>
          <div style={{display:"flex",gap:"0.4rem"}}>
            <button
              onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              style={{background:"var(--bg-secondary)",border:"1px solid var(--border)",color:page===1?"var(--text-dim)":"var(--text-primary)",padding:"0.35rem 0.75rem",borderRadius:"6px",cursor:page===1?"not-allowed":"pointer",fontFamily:"var(--font-mono)",fontSize:"0.75rem"}}
            >← Prev</button>
            <span style={{padding:"0.35rem 0.75rem",fontSize:"0.75rem",color:"var(--text-secondary)"}}>
              {page}/{totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
              style={{background:"var(--bg-secondary)",border:"1px solid var(--border)",color:page===totalPages?"var(--text-dim)":"var(--text-primary)",padding:"0.35rem 0.75rem",borderRadius:"6px",cursor:page===totalPages?"not-allowed":"pointer",fontFamily:"var(--font-mono)",fontSize:"0.75rem"}}
            >Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
