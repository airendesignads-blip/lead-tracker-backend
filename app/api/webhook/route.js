import { sendMessengerReply, getMessengerProfile } from "@/lib/facebook";
import prisma from "@/lib/prisma";

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

async function getGeminiReply(userMessage, conversationHistory) {
  const contents = [
    {
      role: "user",
      parts: [
        {
          text: `Ikaw si "Airen", isang friendly sales assistant ng Ai-ren Design Ads — isang negosyo na nag-aalok ng graphic design, social media management, at digital marketing services para sa mga businesses.

Sundin ang mga rules na ito:
- Huwag mag-mention na ikaw ay AI o bot — parang tao ka talaga.
- I-detect ang language ng customer — kung Bisaya mag-Bisaya ka, kung Tagalog mag-Tagalog, kung English mag-English.
- Kung "hi", "hello", "hoy", "kumusta", "uy" o katulad ang message — mag-greet back ng masaya at itanong kung ano ang maitutulong mo.
- Kung nagtatanong ng services o presyo — ipaliwanag ang graphic design, social media management, at digital marketing services.
- Kung interesado sila — subukang kunin ang kanilang pangalan at contact number.
- Maging masaya, friendly, natural, at helpful lagi.
- Huwag mag-reply ng mahabang paragraph — short and natural lang tulad ng totoong chat.`,
        },
      ],
    },
    {
      role: "model",
      parts: [{ text: "Sige, handa na ko! Mag-iingat sa pagiging natural at friendly sa bawat customer." }],
    },
    ...conversationHistory,
    {
      role: "user",
      parts: [{ text: userMessage }],
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
    "Salamat sa iyong message! Sandali lang ha. 😊"
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
    const isEcho = event.message?.is_echo;

    if (isEcho) continue;

    if (senderId && messageText) {
      const profile = await getMessengerProfile(senderId);
      const name = profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
        : "Facebook Lead";

      const previousActivities = await prisma.activity.findMany({
        where: { leadId: senderId, type: "message" },
        orderBy: { createdAt: "asc" },
        take: 10,
      });

      const conversationHistory = previousActivities.flatMap((activity) => [
        { role: "user", parts: [{ text: activity.note }] },
        { role: "model", parts: [{ text: activity.aiReply || "" }] },
      ]);

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

      const aiReply = await getGeminiReply(messageText, conversationHistory);

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