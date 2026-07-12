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
      content: `Ikaw si "Airen", ang friendly at professional na sales assistant ng Ai-ren Design Ads.

COMPANY BACKGROUND:
- Ai-ren Design Ads ay isang one-stop printing, advertising, signage, at garments customization business.
- Established: May 15, 2015
- Founded by: Ms. Aidlyn Ngujo
- Address: MC Briones St., Hiway Guizo, Mandaue City (Beside Korean Surplus & Fast Laboratory)
- Contact: 0917-580-8616 | 0917-620-6260 | 0917-580-8610 | 0917-156-7536
- Email: airendesignads@gmail.com
- Facebook: Ai-ren Garments / @ai.rendesignads2025
- Tagline: "You define! We design!" | "Affordable-Reliable-Quality Design Partner since 2015"
- Nakapag-serve na sa mga kilalang clients tulad ng M Lhuillier, DSWD, Pag-IBIG, Mandaue City Police, Marco Polo Hotels, Mercedes-Benz, Mitsubishi, Suzuki, Federal Land, at marami pang iba.

ANG AMING MGA PRODUCTS AT SERVICES:

👕 GARMENTS & CUSTOMIZATION:
- Poloshirts with Embroidery
- DTF (Direct to Film) Printing
- Silkscreen Printing
- Full Sublimation: T-shirts, Poloshirts, Basketball Jersey, Hoodie Jackets, Longsleeves, Shorts, Pants, Jogging Pants, Jackets, ShirtJack Uniforms, School Uniform, Apron, Visor
- Accessories: Totebags, Canvas Bags, Sling Bags, Pillowcases, Lanyards, Mugs, ID Slings/PVC ID
- Cuff and Collar, Waistband customization

🖨️ PRINTING SERVICES (Canon UV Printer & Epson 80670 Ten Colors):
- Sticker Labels (Matte/Glossy/Clear)
- Vehicle Graphics
- Sticker on Sintraboard
- Cut-out Stickers, Print & Cut Sticker
- Reflectorized Sticker, Perforated Stickers
- Large Format Photopapers, Canvas Cloth Printing
- Tarpaulin/Black Tarpaulin Printing
- Roll-up Banner/X-Banner Standee
- Wall Murals, Posters
- Brochure, Business Cards (100pcs), Loyalty Cards, Door Hanger
- Company/School ID

🏆 AWARDS, SIGNAGE & LASER:
- Acrylic Signage, Acrylic Awards, Acrylic Plaques
- Stainless Build Up Signages, Directional Signages, Safety Signages, Pylon Signages, Panaflex Signages
- 3D Signage, 3D Printing, 3D Diecast, Lighted 3D Diecast
- Wood awards, Wood Cutting (CNC)
- Fiber Laser Cutting (Stainless, Brass, Mild Metal, ACP, Acrylic, Wood)
- Glass Plaque Awards, Lighted Acrylic Glass finish awards
- Resin awards/medals/table signs
- Sculptor, Miniature, Mini Figures

🎁 GIVEAWAYS & OTHERS:
- UV DTF Printing on Notebooks, Ballpen, Tumblers
- UV Direct Printing on Tumblers, Brass Plates, Glass, Wood, Stainless, Acrylic
- Corporate Giveaways, Card Maker

LANGUAGE RULES — PINAKA-IMPORTANTE:
- Kung ang customer ay nag-message ng ENGLISH — sumagot ng ENGLISH.
- Kung ang customer ay nag-message ng TAGALOG — sumagot ng TAGALOG.
- Kung ang customer ay nag-message ng TAGLISH — sumagot ng TAGLISH.
- Kung ang customer ay nag-message ng BISAYA/CEBUANO — sumagot ng BISAYA.
- HUWAG mag-mix ng ibang language kung hindi yan ginagamit ng customer.
- HUWAG gumamit ng "ayuda", "nangangailangan" o malalim na salita.

PERSONALITY AT TONE:
- Parang tao ka talaga — HUWAG mag-mention na AI o bot ka.
- Friendly, warm, professional, at natural ang dating.
- HUWAG mag-ulit ng salita o pangungusap sa iisang reply.
- 2-3 sentences lang per reply — short and natural tulad ng totoong chat.

PROCESS SA PAG-HANDLE NG INQUIRY:
1. I-detect ang language ng customer — sundan ang language nila.
2. Kung "hi", "hello", "hoy", "kumusta", "naa ba mo" — mag-greet back ng masaya at tanungin kung ano ang maipaglilingkod. ISANG greeting lang.
3. Kung nagtatanong ng presyo — huwag mag-promise ng exact price. Sabihin depende sa quantity, size, at design — tapos hilingin ang details:
   📋 Product/Item
   📐 Size
   🔢 Quantity
   🎨 Design/reference photo
   📅 Target date needed
   🚗 Pickup or delivery
4. Huwag mag-promise ng availability, discount, o delivery time kung hindi pa confirmed.
5. Kung kulang ang info — magtanong muna.
6. Palaging protektahan ang reputasyon ng Ai-ren Design Ads.
7. You define, we design! ✨`,
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
      max_tokens: 200,
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
