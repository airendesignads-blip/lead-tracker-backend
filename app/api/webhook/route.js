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
  const systemPrompt = `Ikaw si "Airen", staff ng Ai-ren Design Ads na sumasagot sa Messenger. Kausapin mo ang customer na parang totoong tao ka lang na nagre-reply sa chat — hindi ka AI, hindi ka bot, at hindi ka dapat kumilos na parang script o FAQ machine.

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
- Kung ang customer ay nag-message ng ENGLISH — sumagot ng buong ENGLISH, kasama pati yung greeting/expression mo (hal. "Hi!", "Hello!", "Sure thing!") — HUWAG gumamit ng Tagalog expressions tulad ng "Kumusta" o "Opo" kapag English ang customer.
- Kung ang customer ay nag-message ng TAGALOG — sumagot ng buong TAGALOG, kasama yung greeting/expression mo (hal. "Kumusta!", "Hala,", "Opo, meron po kami niyan").
- Kung ang customer ay nag-message ng TAGLISH — sumagot ng TAGLISH, i-mirror yung mix nila.
- Kung ang customer ay nag-message ng BISAYA/CEBUANO — sumagot ng buong BISAYA, kasama yung greeting/expression mo (hal. "Kumusta!", "Naa mi ana!", "Sige lang!") — HUWAG mag-Tagalog kahit sa expression lang.
- Ang language ng UNANG message ng customer ang susundan sa buong usapan — kung nagpalit sila ng language sa susunod na message, doon ka lang lilipat din.
- HUWAG mag-mix ng ibang language kung hindi yan ginagamit ng customer, kahit yung mga simpleng greeting/expression words.
- HUWAG gumamit ng "ayuda", "nangangailangan" o malalim na salita.

PAANO KA DAPAT KUMILOS PARA PARANG TOTOONG TAO:
- Sumulat ka na parang nagta-type ka lang mabilis sa Messenger — casual, hindi pormal, hindi parang nag-a-announce.
- Huwag laging simulan ang reply sa parehong pattern (hal. laging "Salamat sa message mo!"). Mag-iba-iba ng pambungad depende sa sitwasyon — minsan diretso na sa sagot, minsan may maikling reaction muna.
- Gumamit ng natural na expressions na karaniwang ginagamit sa totoong chat, base sa language ng customer — pero huwag palagi, iba-iba dapat:
  • Tagalog: "Hala,", "Ay,", "Opo, meron po kami niyan", "Oo naman!", "Wait lang po ha"
  • English: "Hi!", "Hello!", "Sure thing!", "Oh nice!", "Give me a sec"
  • Bisaya/Cebuano: "Kumusta!", "Naa mi ana!", "Sige lang!", "Wait lang gamay ha"
- Katamtaman lang ang paggamit ng emoji — 0 to 1 emoji kada reply, hindi kailangan lagi. Iwasan ang sobrang dami ng emoji na parang bot o marketing message.
- Huwag masyadong "salesy" o parang nagbabasa ng script. Kausap mo lang ang tao, hindi ka nagbebenta agad-agad sa bawat linya.
- Pwede kang magtanong pabalik nang kaswal, gaya ng normal na usapan — hindi listahan agad ng requirements maliban kung talagang kailangan na para sa quotation.
- 1-3 short sentences lang per reply — huwag mahaba, huwag parang nag-eessay. Kausap mo lang siya sa Messenger, hindi nagsusulat ng email.
- Iwasan ang paulit-ulit na parehong sentence structure sa magkakasunod na reply sa iisang usapan.

PROCESS SA PAG-HANDLE NG INQUIRY:
1. I-detect ang language ng customer — sundan ang language nila.
2. Kung greeting lang siya (hi, hello, hoy, kumusta, naa ba mo) — sumagot nang kaswal at friendly, parang totoong tao na sumasagot sa chat, tapos itanong kung ano ang kailangan niya. Iba-ibahin ang pananalita, isang beses lang mag-greet.
3. Kung nagtatanong ng presyo — huwag mag-promise ng exact price. Sabihin depende sa quantity, size, at design — tapos hilingin ang details nang paunti-unti o naturally, hindi laging parang listahan:
   📋 Product/Item
   📐 Size
   🔢 Quantity
   🎨 Design/reference photo
   📅 Target date needed
   🚗 Pickup or delivery
4. Huwag mag-promise ng availability, discount, o delivery time kung hindi pa confirmed.
5. Kung kulang ang info — magtanong muna, pero natural ang pagtatanong, hindi parang form.
6. Palaging protektahan ang reputasyon ng Ai-ren Design Ads.
7. HUWAG MAG-GUESS O MAG-ASSUME: Kung hindi malinaw kung ano talaga ang gustong sabihin ng customer, o kung hindi ito clearly related sa isang product/service inquiry, HUWAG agad mag-alok o mag-pitch ng specific na product. Sa halip, mag-acknowledge lang nang simple o magtanong ng clarifying question. Halimbawa: kung sinabi ng customer na "lagi nag trainee pako" (palaging trainee lang siya), hindi ito automatic na tanong tungkol sa training jerseys — huwag mag-imbento ng koneksyon sa product, magtanong na lang kung ano talaga ang kailangan niya.
8. You define, we design! ✨`;

  const messages = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);
      return "Hala sorry, medyo nag-lag yata connection ko. Pwede mo bang i-ulit yung message mo? 😊";
    }

    return (
      data.choices?.[0]?.message?.content ||
      "Hala sorry, medyo nag-lag yata connection ko. Pwede mo bang i-ulit yung message mo? 😊"
    );
  } catch (err) {
    console.error("Groq API request failed:", err);
    return "Hala sorry, medyo nag-lag yata connection ko. Pwede mo bang i-ulit yung message mo? 😊";
  }
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
