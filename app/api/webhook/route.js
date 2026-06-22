import { sendMessengerReply, getMessengerProfile } from "@/lib/facebook";
import prisma from "@/lib/prisma";

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

async function getGeminiReply(userMessage, conversationHistory) {
  const contents = [
    {
      parts: [
        {
          text: `Ikaw ay isang friendly customer service assistant ng Ai-ren Design Ads. 
Sumagot sa Tagalog o English depende sa message ng customer. 
Maging natural, helpful, at parang tao talaga ang sumasagot — tulad ng isang salesperson.
Huwag mag-mention na ikaw ay AI.
Tandaan ang buong conversation at mag-follow up kung kailangan.`,
        },
      ],
      role: "user",
    },
    {
      parts: [{ text: "Okay! Handa na ako tumulong sa mga customers. 😊" }],
      role: "model",
    },
    ...conversationHistory,
    {
      parts: [{ text: userMessage }],
      role: "user",
    },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    }
  );
  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Salamat sa iyong message! Sasagot kami sa inyo agad. 😊"
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Verification failed", { status: 403 });
}

export async function POST(request) {
  const body = await request.json();
  if (body.object !== "page") return new Response("Not a page event", { status: 404 });

  for (const entry of body.entry || []) {
    const event = entry.messaging?.[0];
    if (!event) continue;

    const senderId = event.sender?.id;
    const messageText = event.message?.text;

    if (senderId && messageText) {
      const profile = await getMessengerProfile(senderId);
      const name = profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
        : "Facebook Lead";

      // I-get ang last 10 messages para sa conversation history
      const previousActivities = await prisma.activity.findMany({
        where: { leadId: senderId, type: "message" },
        orderBy: { createdAt: "asc" },
        take: 10,
      });

      // I-convert sa Gemini conversation format
      const conversationHistory = previousActivities.flatMap((activity) => [
        { role: "user", parts: [{ text: activity.note }] },
        { role: "model", parts: [{ text: activity.aiReply || "" }] },
      ]);

      // I-upsert ang lead
      try {
        await prisma.lead.upsert({
          where: { id: senderId },
          update: { updatedAt: new Date() },
          create: {
            id: senderId,
            name,
            source: "facebook",
            activities: { create: { type: "message", note: messageText } },
          },
        });
      } catch (err) {
        console.error("Error saving lead:", err);
      }

      // Kumuha ng AI reply na may history
      const aiReply = await getGeminiReply(messageText, conversationHistory);

      // I-save ang message at AI reply
      await prisma.activity.create({
        data: {
          leadId: senderId,
          type: "message",
          note: messageText,
          aiReply: aiReply,
        },
      });

      await sendMessengerReply(senderId, aiReply);
    }
  }
  return new Response("EVENT_RECEIVED", { status: 200 });
}