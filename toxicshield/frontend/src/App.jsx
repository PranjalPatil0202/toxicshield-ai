import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import AnalyticsPage from "./pages/AnalyticsPage";
import ModerationLogs from "./pages/ModerationLogs";
import CommentAnalyzer from "./pages/CommentAnalyzer";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("analyzer");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) return (
    <div className="loading-screen">
      <div className="shield-loader">
        <div className="shield-icon">🛡️</div>
        <div className="loading-bar"><div className="loading-fill" /></div>
        <p>Initializing ToxicShield AI...</p>
      </div>
    </div>
  );

  if (!user) return <LoginPage />;

  const pages = {
    analyzer: <CommentAnalyzer />,
    dashboard: <Dashboard />,
    analytics: <AnalyticsPage />,
    logs: <ModerationLogs />,
    admin: user.role === "admin" ? <AdminPanel /> : <CommentAnalyzer />,
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isOpen={sidebarOpen}
        userRole={user.role}
      />
      <div className={`main-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <Header toggleSidebar={() => setSidebarOpen(o => !o)} />
        <div className="page-content">{pages[currentPage] || pages.analyzer}</div>
      </div>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
