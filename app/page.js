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
              <th style={{ padding: "8px" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px" }}>{lead.name}</td>
                <td style={{ padding: "8px" }}>{lead.email || "-"}</td>
                <td style={{ padding: "8px" }}>{lead.source}</td>
                <td style={{ padding: "8px" }}>{lead.stage}</td>
                <td style={{ padding: "8px", color: heatColor[lead.heat] || "#000" }}>
                  {lead.heat}
                </td>
                <td style={{ padding: "8px" }}>
                  {new Date(lead.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
