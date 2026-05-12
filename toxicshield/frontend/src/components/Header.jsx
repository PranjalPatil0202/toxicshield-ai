import { useState, useEffect } from "react";

export default function Header({ toggleSidebar }) {
  const [wsConnected, setWsConnected] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    // Simulate WebSocket connection
    setTimeout(() => setWsConnected(true), 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="toggle-btn" onClick={toggleSidebar}>☰</button>
        <span className="breadcrumb">{time.toLocaleTimeString()} UTC</span>
      </div>
      <div className="status-bar">
        <div className="ws-indicator">
          <div className={`ws-dot ${wsConnected ? "connected" : "disconnected"}`} />
          <span className="status-text">{wsConnected ? "WS Connected" : "Connecting..."}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
          <div className="status-dot" />
          <span className="status-text">Model Online · DistilBERT</span>
        </div>
      </div>
    </header>
  );
}
