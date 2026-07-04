// app/api/messenger/send/route.js
//
// Sumusubok muna ng RESPONSE (within 24h window)
// Kung error #10 (outside window), automatic na gagamit ng HUMAN_AGENT tag
// para makapag-reply kahit lumang conversation

import { NextResponse } from "next/server";

async function sendToMessenger(leadId, message, messagingType, tag = null) {
  const body = {
    recipient:      { id: leadId },
    message:        { text: message },
    messaging_type: messagingType,
  };
  if (tag) body.tag = tag;

  const res  = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    }
  );
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function POST(req) {
  try {
    const { leadId, message } = await req.json();

    if (!leadId || !message?.trim()) {
      return NextResponse.json({ error: "leadId at message ay required." }, { status: 400 });
    }

    if (!process.env.FB_PAGE_ACCESS_TOKEN) {
      return NextResponse.json({ error: "FB_PAGE_ACCESS_TOKEN is not set." }, { status: 500 });
    }

    const text = message.trim();

    // ── Step 1: Subukan muna ang normal RESPONSE (within 24h) ──────────────
    let result = await sendToMessenger(leadId, text, "RESPONSE");

    // ── Step 2: Kung error #10 (outside 24h window), gamitin HUMAN_AGENT ──
    if (!result.ok && result.data?.error?.code === 10) {
      console.log("[messenger/send] Outside 24h window, retrying with HUMAN_AGENT tag...");
      result = await sendToMessenger(leadId, text, "MESSAGE_TAG", "HUMAN_AGENT");
    }

    // ── Step 3: Kung error pa rin, subukan UPDATE tag ──────────────────────
    if (!result.ok && result.data?.error?.code === 10) {
      result = await sendToMessenger(leadId, text, "MESSAGE_TAG", "ACCOUNT_UPDATE");
    }

    if (!result.ok) {
      console.error("[messenger/send] FB API error:", result.data);
      const errMsg = result.data?.error?.message ?? "Facebook API error.";
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    // ── Log sa Activity table (optional) ───────────────────────────────────
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.activity.create({
        data: {
          leadId:    leadId,
          type:      "manual_reply",
          note:      text,
          aiReply:   text,
          createdAt: new Date(),
        },
      });
    } catch (prismaErr) {
      console.warn("[messenger/send] Prisma log failed (non-fatal):", prismaErr.message);
    }

    return NextResponse.json({ success: true, messageId: result.data.message_id });

  } catch (err) {
    console.error("[messenger/send] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
