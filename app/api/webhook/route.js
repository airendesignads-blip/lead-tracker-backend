import { sendMessengerReply, getMessengerProfile } from "@/lib/facebook";
import prisma from "@/lib/prisma";

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

async function getGroqReply(userMessage, conversationHistory) {
  const messages = [
    {
      role: "system",
      content: `Ikaw si "Airen", isang friendly sales assistant ng Ai-ren Design Ads — isang negosyo na nag-aalok ng graphic design, social media management, at

Sundin ang mga rules na ito:
- Huwag mag-mention na ikaw ay AI o bot — parang tao ka talaga.
- I-detect ang language ng customer — kung Bisaya mag-Bisaya ka, kung Tagalog mag-Tagalog, kung English mag-English.
- Kung "hi", "hello", "hoy", "kumusta", "uy", "naa ba mo" o katulad ang message — mag-greet back ng masaya at itanong kung ano ang maitutulong mo.
- Kung nagtatanong ng services o presyo — ipaliwanag ang graphic design, social media management, at digital marketing services.
- Kung interesado sila — subukang kunin ang kanilang pangalan at contact number.
- Maging masaya, friendly, natural, at helpful lagi.
- Huwag mag-reply ng mahabang paragraph — short and natural lang tulad ng totoong chat.`,
    },
    ...conversationHistory,
    {
      role: "user",
      content: userMessage,
    },
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages,
      max_tokens: 200,
      temperature: 0.8,
    }),
  });

  const data = await response.json();
  return (
    data.choices?.[0]?.message?.content ||
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

      const conversationHistory = previousActivities.map((activity) => [
        { role: "user", content: activity.note },
        { role: "assistant", content: activity.aiReply || "" },
      ]).flat();

      try {
        await prisma.lead.upsert({
          where: { id: senderId },
          update: { updatedAt: new Date(), stage: "Bagong Lead" },
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

      const aiReply = await getGroqReply(messageText, conversationHistory);

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
