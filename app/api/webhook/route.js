import { sendMessengerReply, getMessengerProfile } from "@/lib/facebook";
import prisma from "@/lib/prisma";

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

// Check kung PH time (UTC+8)
function getPHHour() {
  const now = new Date();
  const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return phTime.getUTCHours();
}

// Dapat bang mag-reply ang AI?
function shouldAIReply(lead) {
  const hour = getPHHour();

  // 6PM hanggang 9AM — AI lahat
  const isNightTime = hour >= 18 || hour < 9;
  if (isNightTime) return true;

  // Kung walang human reply pa — AI agad
  if (!lead?.lastHumanReply) return true;

  // Kung higit 1 minute na walang human reply — AI na
  const now = new Date();
  const minutesSinceHumanReply =
    (now - new Date(lead.lastHumanReply)) / 1000 / 60;
  return minutesSinceHumanReply >= 1;
}

async function getGroqReply(userMessage, conversationHistory) {
  const messages = [
    {
      role: "system",
      content: `Ikaw si "Airen", isang friendly sales assistant ng Ai-ren Design Ads — isang negosyo na nag-aalok ng custom printing, signage, garments, giveaways, stickers, tarpaulins, acrylic works, 3D awards, at iba pang advertising needs.

Sundin ang mga rules na ito:
- Huwag mag-mention na ikaw ay AI o bot — parang tao ka talaga.
- I-detect ang language ng customer — kung Bisaya mag-Bisaya ka, kung Tagalog mag-Tagalog, kung English mag-English.
- Kung "hi", "hello", "hoy", "kumusta", "uy", "naa ba mo" o katulad ang message — mag-greet back ng masaya at itanong kung ano ang maitutulong mo.
- Kung nagtatanong ng services o presyo — ipaliwanag ang aming products at services.
- Kung interesado sila — subukang kunin ang kanilang: Product/Item, Size, Quantity, Design reference, Target date, Pickup or delivery.
- Maging masaya, friendly, natural, at helpful lagi.
- Huwag mag-reply ng mahabang paragraph — short and natural lang tulad ng totoong chat.
- You define, we design!`,
    },
    ...conversationHistory,
    { role: "user", content: userMessage },
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

async function getPostTitle(postId) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${postId}?fields=message,story&access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`
    );
    const data = await res.json();
    return data.message?.slice(0, 80) || data.story || "Facebook Post";
  } catch {
    return "Facebook Post";
  }
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

    // ✅ MESSENGER MESSAGES
    const event = entry.messaging?.[0];
    if (event) {
      const senderId = event.sender?.id;
      const messageText = event.message?.text;
      const isEcho = event.message?.is_echo;

      // Kung echo — nag-reply ang HUMAN — i-update ang lastHumanReply
      if (isEcho && senderId) {
        try {
          await prisma.lead.update({
            where: { id: senderId },
            data: { lastHumanReply: new Date() },
          });
        } catch (err) {
          console.error("Error updating lastHumanReply:", err);
        }
        continue;
      }

      if (!isEcho && senderId && messageText) {
        const profile = await getMessengerProfile(senderId);
        const name = profile
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
          : "Facebook Lead";

        // Kunin ang existing lead
        let lead = await prisma.lead.findUnique({
          where: { id: senderId },
        });

        // I-check kung dapat mag-reply ang AI
        const aiShouldReply = shouldAIReply(lead);

        const previousActivities = await prisma.activity.findMany({
          where: { leadId: senderId, type: "message" },
          orderBy: { createdAt: "asc" },
          take: 10,
        });

        const conversationHistory = previousActivities
          .map((activity) => [
            { role: "user", content: activity.note },
            { role: "assistant", content: activity.aiReply || "" },
          ])
          .flat();

        // I-save ang lead at message
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

        if (aiShouldReply) {
          const aiReply = await getGroqReply(messageText, conversationHistory);

          await prisma.activity.create({
            data: {
              leadId: senderId,
              type: "message",
              note: messageText,
              aiReply,
            },
          });

          await sendMessengerReply(senderId, aiReply);
        } else {
          // Hindi mag-rereplly ang AI — human ang bahala
          await prisma.activity.create({
            data: {
              leadId: senderId,
              type: "message",
              note: messageText,
            },
          });
        }
      }
    }

    // ✅ FACEBOOK POST COMMENTS
    for (const change of entry.changes || []) {
      if (change.field === "feed" && change.value?.item === "comment") {
        const commentData = change.value;
        const commenterId = commentData.sender_id?.toString();
        const commenterName = commentData.sender_name || "Facebook Commenter";
        const commentText = commentData.message || "";
        const postId = commentData.post_id || "";

        if (!commenterId || !commentText) continue;

        const postTitle = await getPostTitle(postId);
        const leadId = `fb_comment_${commenterId}`;

        try {
          await prisma.lead.upsert({
            where: { id: leadId },
            update: {
              updatedAt: new Date(),
              stage: "Bagong Lead",
              comment: commentText,
              postId: postId,
              postTitle: postTitle,
            },
            create: {
              id: leadId,
              name: commenterName,
              source: "facebook",
              postId: postId,
              postTitle: postTitle,
              comment: commentText,
              activities: {
                create: {
                  type: "comment",
                  note: `Commented on "${postTitle}": ${commentText}`,
                },
              },
            },
          });
        } catch (err) {
          console.error("Error saving comment lead:", err);
        }
      }
    }
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}
