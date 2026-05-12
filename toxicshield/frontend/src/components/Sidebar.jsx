import { useAuth } from "../context/AuthContext";

const navItems = [
  { id: "analyzer", icon: "🔍", label: "Comment Analyzer", section: "main" },
  { id: "dashboard", icon: "📊", label: "Live Dashboard", section: "main", badge: "LIVE" },
  { id: "analytics", icon: "📈", label: "Analytics", section: "main" },
  { id: "logs", icon: "📋", label: "Moderation Logs", section: "main" },
  { id: "admin", icon: "⚙️", label: "Admin Panel", section: "admin", adminOnly: true },
];

export default function Sidebar({ currentPage, setCurrentPage, isOpen, userRole }) {
  const { user, logout } = useAuth();

  const sections = { main: "Navigation", admin: "Administration" };
  const grouped = navItems.reduce((acc, item) => {
    if (item.adminOnly && userRole !== "admin") return acc;
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  return (
    <aside className={`sidebar ${isOpen ? "" : "closed"}`}>
      <div className="sidebar-logo">
        <span className="logo-shield">🛡️</span>
        <div>
          <div className="logo-text">Toxic<span>Shield</span></div>
          <div style={{marginTop:"0.2rem"}}><span className="logo-badge">AI</span></div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section}>
            <div className="nav-section-label">{sections[section]}</div>
            {items.map(item => (
              <div
                key={item.id}
                className={`nav-item ${currentPage === item.id ? "active" : ""}`}
                onClick={() => setCurrentPage(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{user?.username}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">⏻</button>
        </div>
      </div>
    </aside>
  );
}
