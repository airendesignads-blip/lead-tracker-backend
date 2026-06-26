import prisma from "@/lib/prisma";

const FB_PAGE_ID = "16787784839106037";
const FB_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

export async function POST() {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/conversations?fields=participants,messages{message,created_time,from}&access_token=${FB_ACCESS_TOKEN}&limit=100`
    );
    const data = await response.json();

    if (!data.data) {
      return Response.json({ error: "No conversations found", details: data }, { status: 400 });
    }

    let imported = 0;

    for (const conversation of data.data) {
      const participants = conversation.participants?.data || [];"use client";

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

      const customer = participants.find((p) => p.id !== FB_PAGE_ID);
      if (!customer) continue;

      const messages = conversation.messages?.data || [];

      await prisma.lead.upsert({
        where: { id: customer.id },
        update: { updatedAt: new Date() },
        create: {
          id: customer.id,
          name: customer.name || "Facebook Lead",
          source: "facebook",
        },
      });

      for (const msg of messages.reverse()) {
        if (msg.message) {
          const existing = await prisma.activity.findFirst({
            where: { leadId: customer.id, note: msg.message },
          });
          if (!existing) {
            await prisma.activity.create({
              data: {
                leadId: customer.id,
                type: "message",
                note: msg.message,
                aiReply: msg.from?.id === FB_PAGE_ID ? msg.message : null,
              },
            });
          }
        }
      }

      imported++;
    }

    return Response.json({ success: true, imported });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
