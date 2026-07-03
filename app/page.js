// app/api/messenger/send-attachment/route.js
//
// Nag-se-send ng image/file/docx sa Messenger via Facebook Graph API
// Gumagamit ng multipart/form-data upload

import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const leadId   = formData.get("leadId");
    const file     = formData.get("file");

    if (!leadId || !file) {
      return NextResponse.json({ error: "leadId at file ay required." }, { status: 400 });
    }

    // Determine attachment type based on mime type
    const mime = file.type || "";
    const type = mime.startsWith("image/")  ? "image"
               : mime.startsWith("video/")  ? "video"
               : mime.startsWith("audio/")  ? "audio"
               : "file";

    // Build multipart body para sa Facebook Send API
    const fbForm = new FormData();
    fbForm.append("recipient", JSON.stringify({ id: leadId }));
    fbForm.append("message", JSON.stringify({
      attachment: {
        type,
        payload: { is_reusable: true },
      },
    }));
    fbForm.append("filedata", file, file.name);
    fbForm.append("messaging_type", "RESPONSE");

    const fbRes = await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`,
      { method: "POST", body: fbForm }
    );

    const fbData = await fbRes.json();

    if (!fbRes.ok) {
      console.error("[send-attachment] FB error:", fbData);
      return NextResponse.json(
        { error: fbData?.error?.message ?? "Facebook API error." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, messageId: fbData.message_id });
  } catch (err) {
    console.error("[send-attachment] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
