// app/api/messenger/send/route.js
//
// Sumusubok ng RESPONSE (within 24h window) lang.
// Kung error #10 (outside window), hindi na natin sinusubukan yong
// HUMAN_AGENT / ACCOUNT_UPDATE tags — hindi approved ng Meta ang App natin
// para dito, at delikado gamitin ang ACCOUNT_UPDATE para sa random na reply
// (pwede ma-restrict ang Page kapag na-misuse ang tag na yun).
// Sa halip, sinasabi natin sa frontend na "outsideWindow" para doon na lang
// mag-open ng Facebook Business Messenger para sa manual reply.
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

    // ── Subukan ang normal RESPONSE (within 24h) ──────────────
    const result = await sendToMessenger(leadId, text, "RESPONSE");

    // ── Kung error #10 (outside 24h window), i-signal sa frontend na
    //    mag-open na lang ito ng Messenger directly para sa manual reply ──
    if (!result.ok && result.data?.error?.code === 10) {
      console.log("[messenger/send] Outside 24h window — signaling frontend to open Messenger.");
      return NextResponse.json({ outsideWindow: true });
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
