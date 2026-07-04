// app/api/messenger/conversation/[leadId]/route.js
//
// Kinukuha ang actual na messages mula sa Facebook Graph API
// para makita ang buong conversation history sa CRM

import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const { leadId } = params;
    const token = process.env.FB_PAGE_ACCESS_TOKEN;

    if (!token) {
      return NextResponse.json({ error: "FB_PAGE_ACCESS_TOKEN not set." }, { status: 500 });
    }

    // Step 1: Hanapin ang conversation ng lead gamit ang PSID
    const convRes = await fetch(
      `https://graph.facebook.com/v21.0/me/conversations?platform=messenger&user_id=${leadId}&fields=id,participants&access_token=${token}`
    );
    const convData = await convRes.json();

    if (!convRes.ok || !convData.data?.length) {
      return NextResponse.json({ messages: [], error: "Conversation not found." });
    }

    const conversationId = convData.data[0].id;

    // Step 2: Kunin ang actual messages ng conversation
    const msgRes = await fetch(
      `https://graph.facebook.com/v21.0/${conversationId}/messages?fields=message,from,created_time,attachments&limit=50&access_token=${token}`
    );
    const msgData = await msgRes.json();

    if (!msgRes.ok) {
      return NextResponse.json({ messages: [], error: msgData?.error?.message });
    }

    // Step 3: I-format ang messages para sa CRM panel
    // Kunin din ang Page ID para malaman kung sino ang "sender" (page) vs "customer"
    const pageRes  = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${token}`);
    const pageData = await pageRes.json();
    const pageId   = pageData.id;

    const messages = (msgData.data || [])
      .reverse() // oldest first
      .map((msg) => ({
        id:          msg.id,
        text:        msg.message || "",
        from:        msg.from?.name || "Unknown",
        fromId:      msg.from?.id,
        isPage:      msg.from?.id === pageId, // true = galing sa Page (reply), false = galing sa customer
        createdAt:   msg.created_time,
        attachments: msg.attachments?.data || [],
      }));

    return NextResponse.json({ messages, conversationId });

  } catch (err) {
    console.error("[conversation] Error:", err);
    return NextResponse.json({ messages: [], error: err.message }, { status: 500 });
  }
}
