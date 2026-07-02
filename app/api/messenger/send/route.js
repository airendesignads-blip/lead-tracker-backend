// app/api/messenger/send/route.js

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const { leadId, message } = await req.json();

    if (!leadId || !message?.trim()) {
      return NextResponse.json({ error: "leadId at message ay required." }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    // lead.id = Facebook PSID ng customer (based sa schema)
    const fbRes = await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient:      { id: lead.id },
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

    // I-log sa Activity table — type="manual_reply", note=yung message
    await prisma.activity.create({
      data: {
        leadId:   lead.id,
        type:     "manual_reply",          // gamit ang existing 'type' field
        note:     message.trim(),          // gamit ang existing 'note' field
        aiReply:  message.trim(),          // para makita sa getReplyStatus() as "Replied"
        createdAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, messageId: fbData.message_id });

  } catch (err) {
    console.error("[messenger/send] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
