"use client";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leads")
      .then((res) => res.json())
      .then((data) => {
        setLeads(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const heatColor = { hot: "#ef4444", warm: "#f59e0b", cold: "#3b82f6" };

  const getReplyStatus = (lead) => {
    const activities = lead.activities || [];
    if (activities.length === 0) return { label: "Walang message", color: "#9ca3af", dot: "⚪" };
    const last = activities[activities.length - 1];
    if (!last.aiReply) return { label: "Hindi pa nareplyan", color: "#ef4444", dot: "🔴" };
    const lastMessageTime = new Date(last.createdAt);
    const hasNewMessage = activities.some(
      (a) => !a.aiReply && new Date(a.createdAt) > lastMessageTime
    );
    if (hasNewMessage) return { label: "Nag-message ulit!", color: "#f59e0b", dot: "🟡" };
    return { label: "Nareplyan na", color: "#22c55e", dot: "🟢" };
  };

  const openMessenger = (lead) => {
    if (lead.source === "facebook") {
      window.open(`https://www.facebook.com/messages/t/${lead.id}`, "_blank");
    }
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Lead Tracker CRM</h1>
      <p>Total Leads: {leads.length}</p>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "8px" }}>Name</th>
              <th style={{ padding: "8px" }}>Email</th>
              <th style={{ padding: "8px" }}>Source</th>
              <th style={{ padding: "8px" }}>Stage</th>
              <th style={{ padding: "8px" }}>Heat</th>
              <th style={{ padding: "8px" }}>Reply Status</th>
              <th style={{ padding: "8px" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const status = getReplyStatus(lead);
              return (
                <tr key={lead.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px", fontWeight: "bold", cursor: "pointer", color: "#3b82f6" }}
                    onClick={() => openMessenger(lead)}>
                    {lead.name}
                  </td>
                  <td style={{ padding: "8px" }}>{lead.email || "-"}</td>
                  <td style={{ padding: "8px" }}>{lead.source}</td>
                  <td style={{ padding: "8px" }}>{lead.stage}</td>
                  <td style={{ padding: "8px", color: heatColor[lead.heat] || "#000" }}>
                    {lead.heat}
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span style={{
                      background: status.color,
                      color: "white",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: "bold"
                    }}>
                      {status.dot} {status.label}
                    </span>
                  </td>
                  <td style={{ padding: "8px" }}>
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}