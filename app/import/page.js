"use client";

import { useState } from "react";

export default function ImportLeadsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleImport() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/import-leads", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResult({ type: "success", message: `Tagumpay! ${data.imported} conversations na-import.` });
      } else {
        setResult({
          type: "error",
          message: (data.error || "May error.") + " | DETAILS: " + JSON.stringify(data.details || data),
        });
      }
    } catch (err) {
      setResult({ type: "error", message: "Hindi ma-connect sa server." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>Import Old Messenger Leads</h1>
      <p style={{ color: "#555", marginBottom: 20 }}>
        I-click ang button para kunin ang lahat ng conversations mo sa Facebook Page at i-import bilang leads.
      </p>

      <button
        onClick={handleImport}
        disabled={loading}
        style={{
          padding: 12,
          width: "100%",
          background: "#16a34a",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontWeight: "bold",
          cursor: "pointer",
          fontSize: 16,
        }}
      >
        {loading ? "Importing... mangyaring maghintay" : "Import Old Leads Now"}
      </button>

      {result && (
        <p style={{ marginTop: 16, color: result.type === "success" ? "green" : "red", fontWeight: "bold", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
          {result.message}
        </p>
      )}

      <a href="/" style={{ display: "inline-block", marginTop: 24, color: "#2563eb" }}>
        ← Back to Lead Tracker
      </a>
    </div>
  );
}
