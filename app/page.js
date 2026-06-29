"use client";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("active");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchLeads = () => {
    fetch("/api/leads")
      .then((res) => res.json())
      .then((data) => {
        setLeads(data);
        setLoading(false);
        setLastUpdated(new Date());
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/auto-archive", { method: "POST" }).catch(console.error);
    fetchLeads();
    const interval = setInterval(fetchLeads, 5000);
    return () => clearInterval(interval);
  }, []);

  const heatColor = { hot: "#ef4444", warm: "#f59e0b", cold: "#3b82f6" };

  const getReplyStatus = (lead) => {
    const activities = lead.activities || [];
    if (activities.length === 0) return { label: "No Message", color: "#9ca3af" };
    const last = activities[activities.length - 1];
    if (!last.aiReply) return { label: "Pending Reply", color: "#ef4444" };
    const lastMessageTime = new Date(last.createdAt);
    const hasNewMessage = activities.some(
      (a) => !a.aiReply && new Date(a.createdAt) > lastMessageTime
    );
    if (hasNewMessage) return { label: "New Message!", color: "#f59e0b" };
    return { label: "Replied", color: "#22c55e" };
  };

  const openMessenger = (lead) => {
    if (lead.source === "facebook") {
      window.open(
        `https://business.facebook.com/latest/inbox/direct/messenger/?asset_id=1678784839106037&threadID=${lead.id}`,
        "_blank"
      );
    }
  };

  const markAsDone = async (leadId, source) => {
    setUpdatingId(leadId);
    const stage = source === "facebook" ? "Facebook Done" : "Email Done";
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      await fetchLeads();
    } finally {
      setUpdatingId(null);
    }
  };

  const markAsActive = async (leadId) => {
    setUpdatingId(leadId);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "Bagong Lead" }),
      });
      await fetchLeads();
    } finally {
      setUpdatingId(null);
    }
  };

  const doneStages = ["Facebook Done", "Email Done", "Done"];

  const filteredLeads = leads.filter((lead) => {
    if (activeTab === "active") return !doneStages.includes(lead.stage);
    if (activeTab === "facebook-done") return lead.stage === "Facebook Done";
    if (activeTab === "email-done") return lead.stage === "Email Done";
    return false;
  });

  const tabStyle = (tab) => ({
    padding: "10px 20px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 15,
    color: activeTab === tab ? "#2563eb" : "#888",
    borderBottom: activeTab === tab ? "3px solid #2563eb" : "3px solid transparent",
  });

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Lead Tracker CRM</h1>
        {lastUpdated && (
          <span style={{ fontSize: "12px", color: "#888" }}>
            Live • Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
      <p>Total Leads: {leads.length}</p>
      <a href="/import" style={{ display: "inline-block", marginBottom: "1rem", marginRight: "8px", padding: "8px 16px", background: "#16a34a", color: "white", borderRadius: 6, textDecoration: "none", fontWeight: "bold", fontSize: 14 }}>+ Import Old Leads</a>
      <div style={{ display: "flex", gap: "8px", marginTop: "1rem", marginBottom: "1rem", borderBottom: "2px solid #eee" }}>
        <button onClick={() => setActiveTab("active")} style={tabStyle("active")}>
          Active Leads ({leads.filter((l) => !doneStages.includes(l.stage)).length})
        </button>
        <button onClick={() => setActiveTab("facebook-done")} style={tabStyle("facebook-done")}>
          Facebook Done ({leads.filter((l) => l.stage === "Facebook Done").length})
        </button>
        <button onClick={() => setActiveTab("email-done")} style={tabStyle("email-done")}>
          Email Done ({leads.filter((l) => l.stage === "Email Done").length})
        </button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd", background: "#f9fafb" }}>
              <th style={{ padding: "10px" }}>Name</th>
              <th style={{ padding: "10px" }}>Email</th>
              <th style={{ padding: "10px" }}>Source</th>
              <th style={{ padding: "10px" }}>Stage</th>
              <th style={{ padding: "10px" }}>Heat</th>
              <th style={{ padding: "10px" }}>Reply Status</th>
              <th style={{ padding: "10px" }}>Created</th>
              <th style={{ padding: "10px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => {
              const status = getReplyStatus(lead);
              const stage = lead.stage === "Bagong Lead" ? "New Lead" : lead.stage;
              const isUpdating = updatingId === lead.id;
              return (
                <tr key={lead.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "10px", fontWeight: "bold", cursor: "pointer", color: "#3b82f6" }} onClick={() => openMessenger(lead)}>
                    {lead.name}
                  </td>
                  <td style={{ padding: "10px" }}>{lead.email || "-"}</td>
                  <td style={{ padding: "10px" }}>{lead.source}</td>
                  <td style={{ padding: "10px" }}>{stage}</td>
                  <td style={{ padding: "10px", color: heatColor[lead.heat] || "#000", textTransform: "capitalize" }}>
                    {lead.heat}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <span style={{ background: status.color, color: "white", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "bold" }}>
                      {status.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px" }}>
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "10px" }}>
                    {activeTab === "active" ? (
                      <button onClick={() => markAsDone(lead.id, lead.source)} disabled={isUpdating} style={{ padding: "6px 12px", background: isUpdating ? "#9ca3af" : "#22c55e", color: "white", border: "none", borderRadius: 6, cursor: isUpdating ? "not-allowed" : "pointer", fontSize: 12, fontWeight: "bold", minWidth: "90px" }}>
                        {isUpdating ? "Saving..." : "Mark Done"}
                      </button>
                    ) : (
                      <button onClick={() => markAsActive(lead.id)} disabled={isUpdating} style={{ padding: "6px 12px", background: isUpdating ? "#9ca3af" : "#6b7280", color: "white", border: "none", borderRadius: 6, cursor: isUpdating ? "not-allowed" : "pointer", fontSize: 12, fontWeight: "bold", minWidth: "90px" }}>
                        {isUpdating ? "Saving..." : "Reopen"}
                      </button>
                    )}
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
