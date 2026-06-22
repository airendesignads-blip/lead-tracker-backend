import { sendMessengerReply, getMessengerProfile } from "@/lib/facebook";
import prisma from "@/lib/prisma";

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const AUTOREPLY_MESSAGE =
  "Salamat sa iyong message! Natanggap namin ang iyong inquiry at may sasagot sa iyo within 24 hours. 😊";

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

      try {
        const lead = await prisma.lead.upsert({
          where: { id: senderId },
          update: { updatedAt: new Date() },
          create: {
            id: senderId,
            name,
            source: "facebook",
            activities: { create: { type: "message", note: messageText } },
          },
        });

        await prisma.activity.create({
          data: { leadId: lead.id, type: "message", note: messageText },
        });
      } catch (err) {
        console.error("Error saving lead:", err);
      }

      await sendMessengerReply(senderId, AUTOREPLY_MESSAGE);
    }
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}
