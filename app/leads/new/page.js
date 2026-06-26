"use client";

import { useState } from "react";

export default function AddLeadPage() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    source: "facebook",
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setStatus({ type: "success", message: "Na-add ang lead!" });
        setForm({ name: "", company: "", email: "", phone: "", source: "facebook" });
      } else {
        const data = await res.json();
        setStatus({ type: "error", message: data.error || "May error, subukan ulit." });
      }
    } catch (err) {
      setStatus({ type: "error", message: "Hindi ma-connect sa server." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>Add Lead</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          name="name"
          placeholder="Name (required)"
          value={form.name}
          onChange={handleChange}
          required
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
        />
        <input
          name="company"
          placeholder="Company (optional)"
          value={form.company}
          onChange={handleChange}
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
        />
        <input
          name="email"
          type="email"
          placeholder="Email (optional)"
          value={form.email}
          onChange={handleChange}
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
        />
        <input
          name="phone"
          placeholder="Phone (optional)"
          value={form.phone}
          onChange={handleChange}
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
        />
        <select
          name="source"
          value={form.source}
          onChange={handleChange}
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
        >
          <option value="facebook">Facebook</option>
          <option value="messenger">Messenger</option>
          <option value="gmail">Gmail</option>
          <option value="website">Website</option>
          <option value="other">Other</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12,
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {loading ? "Saving..." : "Add Lead"}
        </button>
      </form>

      {status && (
        <p style={{ marginTop: 16, color: status.type === "success" ? "green" : "red" }}>
          {status.message}
        </p>
      )}

      <a href="/" style={{ display: "inline-block", marginTop: 24, color: "#2563eb" }}>
        ← Back to Lead Tracker
      </a>
    </div>
  );
}
