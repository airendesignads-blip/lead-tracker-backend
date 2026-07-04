// app/api/messenger/send/route.js

import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { leadId, message } = await req.json();

    if (!leadId || !message?.trim()) {
      return NextResponse.json({ error: "leadId at message ay required." }, { status: 400 });
    }

    if (!process.env.FB_PAGE_ACCESS_TOKEN) {
      return NextResponse.json({ error: "FB_PAGE_ACCESS_TOKEN is not set sa environment variables." }, { status: 500 });
    }

    // leadId = Facebook PSID ng customer
    const fbRes = await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient:      { id: leadId },
          message:        { text: message.trim() },
          messaging_type: "RESPONSE",
        }),
      }
    );

    const fbData = await fbRes.json();

    if (!fbRes.ok) {
      console.error("[messenger/send] FB API error:", fbData);
      return NextResponse.json(
        { error: fbData?.error?.message ?? "Facebook API error." },
        { status: 500 }
      );
    }

    // Log sa Activity table — optional, skip kung may prisma error
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.activity.create({
        data: {
          leadId:    leadId,
          type:      "manual_reply",
          note:      message.trim(),
          aiReply:   message.trim(),
          createdAt: new Date(),
        },
      });
    } catch (prismaErr) {
      // Hindi mag-fail ang send kahit mag-error ang prisma logging
      console.warn("[messenger/send] Prisma log failed (non-fatal):", prismaErr.message);
    }

    return NextResponse.json({ success: true, messageId: fbData.message_id });

  } catch (err) {
    console.error("[messenger/send] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
