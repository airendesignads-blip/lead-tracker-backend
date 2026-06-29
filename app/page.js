"use client";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("messenger");
  const [updatingId, setUpdatingId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

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

  const importComments = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/import-comments", { method: "POST" });
      const data = await res.json();
      setImportResult(`✅ Imported ${data.imported} comments!`);
      await fetchLeads();
    } catch (err) {
      setImportResult("❌ Error importing comments.");
    } finally {
      setImporting(false);
    }
  };

  const heatColor = { hot: "#ef4444", warm: "#f59e0b", cold: "#3b82f6" };
  const doneStages = ["Facebook Done", "Email Done", "Done"];

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

  const messengerLeads = leads.filter((l) => !l.postId && !doneStages.includes(l.stage));
  const commentLeads = leads.filter((l) => l.postId && !doneStages.includes(l.stage));
  const fbDoneLeads = leads.filter((l) => l.stage === "Facebook Done");
  const emailDoneLeads = leads.filter((l) => l.stage === "Email Done");

  const filteredLeads = () => {
    if (activeTab === "messenger") return messengerLeads;
    if (activeTab === "comments") return commentLeads;
    if (activeTab === "facebook-done") return fbDoneLeads;
    if (activeTab === "email-done") return emailDoneLeads;
    return [];
  };

  const tabStyle = (tab) => ({
    padding: "10px 20px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 14,
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

      {/* BUTTONS */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <a href="/import" style={{ display: "inline-block", padding: "8px 16px", background: "#16a34a", color: "white", borderRadius: 6, textDecoration: "none", fontWeight: "bold", fontSize: 14 }}>
          + Import Old Leads
        </a>
        <button
          onClick={importComments}
          disabled={importing}
          style={{ padding: "8px 16px", background: importing ? "#9ca3af" : "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: importing ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: 14 }}
        >
          {importing ? "Importing..." : "📥 Import FB Comments"}
        </button>
        {importResult && <span style={{ fontSize: 13, color: "#16a34a" }}>{importResult}</span>}
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: "4px", marginTop: "1rem", marginBottom: "1rem", borderBottom: "2px solid #eee", flexWrap: "wrap" }}>
        <button onClick={() => setActiveTab("messenger")} style={tabStyle("messenger")}>
          💬 Messenger ({messengerLeads.length})
        </button>
        <button onClick={() => setActiveTab("comments")} style={tabStyle("comments")}>
          🗨️ Post Comments ({commentLeads.length})
        </button>
        <button onClick={() => setActiveTab("facebook-done")} style={tabStyle("facebook-done")}>
          ✅ Facebook Done ({fbDoneLeads.length})
        </button>
        <button onClick={() => setActiveTab("email-done")} style={tabStyle("email-done")}>
          📧 Email Done ({emailDoneLeads.length})
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filteredLeads().length === 0 ? (
        <p style={{ color: "#888", marginTop: "2rem", textAlign: "center" }}>Walang leads dito.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd", background: "#f9fafb" }}>
              <th style={{ padding: "10px" }}>Name</th>
              <th style={{ padding: "10px" }}>Email</th>
              <th style={{ padding: "10px" }}>Source</th>
              {activeTab === "comments" && <th style={{ padding: "10px" }}>Post</th>}
              {activeTab === "comments" && <th style={{ padding: "10px" }}>Comment</th>}
              <th style={{ padding: "10px" }}>Stage</th>
              <th style={{ padding: "10px" }}>Heat</th>
              <th style={{ padding: "10px" }}>Reply Status</th>
              <th style={{ padding: "10px" }}>Created</th>
              <th style={{ padding: "10px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads().map((lead) => {
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
                  {activeTab === "comments" && (
                    <td style={{ padding: "10px", fontSize: 12, color: "#555", maxWidth: 180 }}>
                      {lead.postTitle || "-"}
                    </td>
                  )}
                  {activeTab === "comments" && (
                    <td style={{ padding: "10px", fontSize: 12, color: "#333", maxWidth: 180 }}>
                      {lead.comment || "-"}
                    </td>
                  )}
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
                    {!doneStages.includes(lead.stage) ? (
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
