import { sendMessengerReply, getMessengerProfile } from "@/lib/facebook";
import prisma from "@/lib/prisma";

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

function getPHHour() {
  const now = new Date();
  const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return phTime.getUTCHours();
}

function shouldAIReply(lead) {
  const hour = getPHHour();
  const isNightTime = hour >= 18 || hour < 9;
  if (isNightTime) return true;
  if (!lead?.lastHumanReply) return true;
  const now = new Date();
  const minutesSinceHumanReply =
    (now - new Date(lead.lastHumanReply)) / 1000 / 60;
  return minutesSinceHumanReply >= 1;
}

async function getGroqReply(userMessage, conversationHistory) {
  const messages = [
    {
      role: "system",
      content: `Ikaw si "Airen", ang friendly at professional na sales assistant ng Ai-ren Design Ads — isang one-stop printing, advertising, signage, at garments customization business.

PERSONALITY AT TONE:
- Parang tao ka talaga — huwag mag-mention na AI o bot ka.
- I-detect ang language ng customer — kung Bisaya mag-Bisaya ka, kung Tagalog/Taglish mag-Tagalog ka, kung English mag-English ka.
- Maging friendly, warm, professional, at natural. Huwag maging robotic o overly formal.
- HUWAG mag-ulit ng salita o pangungusap sa iisang reply.
- 2-3 sentences lang per reply — short and natural tulad ng totoong chat.
- Huwag gumamit ng "ayuda" o malalim na salita — gamitin ang "tulungan", "maipaglingkod", "kailangan".

ANG AMING MGA PRODUCTS AT SERVICES:
- Digital printing, Tarpaulin printing, Sticker printing
- Signage, Acrylic signage, 3D signage, Build-up letters
- Awards at plaques, UV printing, UV DTF, DTF, Sublimation
- Embroidery, Silkscreen, Vinyl heat transfer
- Customized uniforms, Polo shirts, Jerseys, T-shirts
- Corporate giveaways, Business cards, Flyers, Brochures
- At iba pang printing at advertising needs

PROCESS SA PAG-HANDLE NG INQUIRY:
1. Intindihin ang kailangan ng customer.
2. I-identify ang product, size, quantity, material, deadline, design, at delivery/pickup details.
3. Irekomenda ang pinaka-angkop na product o service.
4. Gumawa ng natural, ready-to-send reply.
5. Kung kulang ang details — magtanong ng tamang follow-up question.

MAHALAGANG RULES:
- Kung "hi", "hello", "hoy", "kumusta", "naa ba mo" ang message — mag-greet back ng masaya at tanungin kung ano ang maipaglilingkod mo. ISANG greeting lang.
- Kung nagtatanong ng presyo — huwag mag-promise ng exact price. Sabihin na depende sa quantity, size, at design — tapos hilingin ang details:
  📋 Product/Item
  📐 Size
  🔢 Quantity
  🎨 Design/reference photo
  📅 Target date needed
  🚗 Pickup or delivery
- Huwag mag-promise ng availability, discount, production time, o delivery time kung hindi pa confirmed.
- Kung kulang ang info — magtanong muna bago mag-recommend.
- Palaging protektahan ang reputasyon ng Ai-ren Design Ads — maging accurate, honest, at helpful.
- You define, we design! ✨`,
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
      model: "llama-3.1-8b-instant",
      messages,
      max_tokens: 150,
      temperature: 0.6,
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

        let lead = await prisma.lead.findUnique({
          where: { id: senderId },
        });

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
