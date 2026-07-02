// app/api/messenger/send/route.js
//
// Tinatanggap: { leadId, message }
// Nagse-send ng reply sa actual na Facebook Messenger thread
// Nag-lo-log din ng reply sa Activity table

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const { leadId, message } = await req.json();

    if (!leadId || !message?.trim()) {
      return NextResponse.json({ error: "leadId at message ay required." }, { status: 400 });
    }

    // Kunin ang lead para makuha ang Facebook PSID
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    // I-send ang message sa Facebook Messenger via Graph API
    // Ang lead.id ay ang PSID (Facebook sender ID) ng customer
    const fbRes = await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: lead.facebookId ?? lead.id }, // facebookId o id depende sa schema mo
          message:   { text: message.trim() },
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

    // I-log ang reply sa Activity table
    await prisma.activity.create({
      data: {
        leadId:   lead.id,
        aiReply:  message.trim(),
        isManual: true,           // flag na galing sa CRM, hindi AI
        createdAt: new Date(),
      },
    });

    // I-update ang lead stage pabalik sa active kung naka-Done na
    // (optional — tanggalin kung ayaw mo ito)
    // await prisma.lead.update({ where: { id: lead.id }, data: { stage: "Bagong Lead" } });

    return NextResponse.json({ success: true, messageId: fbData.message_id });

  } catch (err) {
    console.error("[messenger/send] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
