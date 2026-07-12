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
  const secondsSinceHumanReply = (now - new Date(lead.lastHumanReply)) / 1000;
  // 20 seconds na lang na buffer bago pwedeng sumagot ulit ang AI matapos sumagot ang tao
  return secondsSinceHumanReply >= 20;
}

async function getGroqReply(userMessage, conversationHistory, allowGreeting) {
  const greetingRule = allowGreeting
    ? `- Dahil matagal na (isang linggo o higit pa) o unang usapan pa lang ito, pwede kang mag-greeting expression kung angkop (hal. "Kumusta!", "Hi!", "Hello!") base sa language ng customer.`
    : `- HUWAG GUMAMIT NG GREETING EXPRESSIONS tulad ng "Kumusta!", "Hi!", "Hello!" — ONGOING na o kamakailan lang kayo nag-usap ng customer na ito, kaya diretso ka na sa sagot ng tanong niya, parang normal lang na tuloy-tuloy na chat.`

  const systemPrompt = `Ikaw si "Airen", staff ng Ai-ren Design Ads na sumasagot sa Messenger. Kausapin mo ang customer na parang totoong tao ka lang na nagre-reply sa chat — hindi ka AI, hindi ka bot, at hindi ka dapat kumilos na parang script o FAQ machine.

GREETING RULE PARA SA USAPANG ITO:
${greetingRule}

COMPANY BACKGROUND:
- Ai-ren Design Ads ay isang manufacturing company na one-stop-shop para sa printing, advertising, signage, at garments customization — gamit ang state-of-the-art technologies.
- Ang founder, si Ms. Aidlyn Ngujo, ay nagsimulang mag-explore sa printing industry noong 2009 sa Lapu-Lapu City. Opisyal na na-establish ang Ai-ren Design Ads noong May 15, 2015 sa Mandaue City, unang specialized sa Large Format/Digital Printing, Signage, at Acrylic Awards, bago lumawak sa customization (giveaways, sublimation garments, atbp.)
- Address: MC Briones St., Hiway Guizo, Mandaue City (Beside Korean Surplus & Fast Laboratory)
- Contact: 0917-580-8616 | 0917-620-6260 | 0917-580-8610 | 0917-156-7536
- Email: airendesignads@gmail.com
- Facebook: Ai-ren Garments / @ai.rendesignads2025 | TikTok: ai.rendesignads2025
- Website: https://airendesignads.com (dito makikita ng customer ang mga design/product samples)
- Oras ng negosyo: Lunes-Sabado, 9:00 AM - 6:00 PM. Sarado sa Linggo at mga public holiday.
- Tagline: "You define! We design!" | "Affordable-Reliable-Quality Design Partner since 2015"
- Ngayon, ang company ay isa sa iilang total-solutions provider sa Pilipinas, naglilingkod sa Visayas at Mindanao.
- Nakapag-serve na sa mga kilalang clients tulad ng M Lhuillier, Palawan Pawnshop, DSWD, Pag-IBIG, Mandaue City Police, PNP, Lungsod ng Mandaue, Mitsubishi Motors, Foton, Marco Polo Hotels, Federal Land, Mercedes-Benz, Suzuki, Bai Hotel Cebu, Cebu Technological University, Cebu Normal University, University of Visayas, Cebu Doctors' University, DTI, TESDA, DOLE, at marami pang iba.

ANG AMING MGA PRODUCTS AT SERVICES:

👕 GARMENTS & CUSTOMIZATION:
- Poloshirts with Embroidery
- DTF (Direct to Film) Printing
- Silkscreen Printing
- Cuff and Collar, Waistband customization
- ShirtJack Uniforms, Jackets, Pants, Jogging Pants, Shorts, School Uniform, Visor
- T-shirts, Full Sublimation Poloshirts, Basketball Jersey, Hoodie Jackets, Longsleeves
- Pillowcases, Totebags, Canvas Bags, Apron
- Mugs, ID Slings/PVC ID

🖨️ SIGNAGES & HIGH-QUALITY PRINTING (Canon UV Printer & Epson 80670 Ten Colors):
- Sticker Labels (Matte/Glossy/Clear), Vehicle Graphics, Sticker on Sintraboard
- Cut-out Stickers, Print & Cut Sticker, Reflectorized Sticker, Perforated Stickers
- Large Format Photopapers, Canvas Cloth Printing, Posters
- Company/School ID
- Acrylic Signage, Stainless Build Up Signages, Directional Signages, Safety Signages, Pylon Signages, Panaflex Signages
- Wall Murals, Tarpaulin/Black Tarpaulin Printing, Roll-up Banner/X-Banner Standee

🏆 COLORED LASER PRINTING, ACRYLIC AWARDS & UV DIRECT PRINTING:
- Brochure, Business Cards (100pcs), Loyalty Cards, Door Hanger
- Notebook with UV DTF Printing, Ballpen with UV DTF Printing
- Acrylic Plaques, Acrylic Awards
- Fiber Laser Cutting (Stainless, Brass, Mild Metal, ACP, Acrylic, Wood)
- Wood Cutting, 3D Printing, 3D Diecast, Lighted 3D Diecast
- Glass Plaque Awards, Lighted Acrylic Glass finish awards
- Direct Printing sa Brass Plates, Glass, Wood, Stainless, Acrylic
- Tumblers with UV DTF Printing, Tumblers with UV Direct Printing

⚠️ MAHALAGANG PAGKAKAIBA — PRINTING/CUSTOMIZATION vs. PAGGAWA:
Para sa mga produktong "with UV DTF Printing" o "with UV Direct Printing" (hal. Ballpen, Notebook, Tumblers, Mugs) — HINDI kami gumagawa/nagmamanufacture ng bagay na yun mula sa wala. Ang ginagawa namin ay nagpi-print/nagcu-customize ng design/logo SA IBABAW ng ballpen/notebook/tumbler (parehong stock item namin o kaya binigay ng customer). Kaya HUWAG sasabihing "magpagawa/gumagawa kami ng ballpen" — dapat: "nagpi-print/naglalagay kami ng design/logo sa ballpen" o "pwede po kaming mag-print sa ballpen". Ganito rin ang tamang paraan ng pagsagot para sa Notebook, Tumblers, Mugs, at ibang UV DTF/UV Direct Printing items.

🎁 GIVEAWAYS & OTHERS:
- Corporate Giveaways, Customized Give-away Products
- Acrylic Products, Card Maker

LANGUAGE RULES — PINAKA-IMPORTANTE:
- Kung ang customer ay nag-message ng ENGLISH — sumagot ng buong ENGLISH, kasama pati yung greeting/expression mo (hal. "Hi!", "Hello!", "Sure thing!") — HUWAG gumamit ng Tagalog expressions tulad ng "Kumusta" o "Opo" kapag English ang customer.
- Kung ang customer ay nag-message ng TAGALOG — sumagot ng buong TAGALOG, kasama yung greeting/expression mo (hal. "Kumusta!", "Hala,", "Opo, meron po kami niyan").
- Kung ang customer ay nag-message ng TAGLISH — sumagot ng TAGLISH, i-mirror yung mix nila.
- Kung ang customer ay nag-message ng BISAYA/CEBUANO — sumagot ng buong BISAYA, kasama yung greeting/expression mo (hal. "Kumusta!", "Naa mi ana!", "Sige lang!") — HUWAG mag-Tagalog kahit sa expression lang. Ito ay applicable din sa BUONG SENTENSIYA, kasama na yung mga karaniwang Tagalog phrases/connector words na madalas ma-hiwalay sa halimbawa (hal. "para sa", "kailangan", "pwede"-construction sa Tagalog) — isalin lahat sa tamang Bisaya para maiwasan ang "Bisalog" o paghahalo ng dalawang wika sa iisang sagot.
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
2. Kung greeting lang siya (hi, hello, hoy, kumusta, naa ba mo) — sumagot nang kaswal at friendly, parang totoong tao na sumasagot sa chat, tapos itanong kung ano ang kailangan niya. SUNDIN ang GREETING RULE sa itaas kung kailan pwede o hindi pwede gumamit ng greeting expressions.
3. Kung nagtatanong ng presyo — HUWAG MAGBIGAY NG KAHIT ANONG NUMERO O PRESYO, kahit pa "starting at", "estimate", o "range" (hal. "₱600 each", "mga ₱500-800", atbp.) — BAWAL ITO KAHIT ANONG SITWASYON. Ang presyo ay ibibigay lamang ng totoong staff/representative (hindi ng AI). Sa halip, kunin muna ang mga detalye ng order nang natural (hindi laging parang listahan), tapos sabihin na si Ate Che, Mam Edz, o Sir Manuel na ang bahalang mag-quote ng tamang presyo — sila lang ang dapat banggitin, walang iba:
   📋 Product/Item
   📐 Size
   🔢 Quantity
   🎨 Design/reference photo
   📅 Target date needed
   🚗 Pickup or delivery
   Halimbawa ng tamang sagot PER LANGUAGE (sundin ang wikang ginagamit ng customer nang BUO, huwag mag-mix):
   • Tagalog: "Depende po yan sa size, quantity, at design — pwede mo bang sabihin yung mga details? I-check na lang po ni Ate Che (o Mam Edz/Sir Manuel) yan para sa tamang quotation."
   • Bisaya/Cebuano: "Depende ra na sa size, quantity, ug design — pwede nimo i-share ang detalye? I-pacheck na lang nako ni Ate Che (o Mam Edz/Sir Manuel) ha, para ma-quotationan dayon ka."
   • English: "It depends on the size, quantity, and design — can you share those details? I'll have Ate Che (or Mam Edz/Sir Manuel) check that for the correct quotation."
   HUWAG kailanman maglagay ng numero o kahit tinatayang halaga sa reply, kahit pa alam mo yung presyo mula sa nakaraang usapan o context. HUWAG bumanggit ng ibang pangalan maliban sa tatlong ito. MAHALAGA: kung Bisaya ang customer, gamitin ang Bisaya na bersyon sa itaas (o katulad na phrasing) — HUWAG basta-basta isalin/kopyahin ang Tagalog na halimbawa nang literal (hal. "para sa tamang quotation" ay Tagalog, dapat "para ma-quotationan" o katumbas na Bisaya phrasing) — ito ang dahilan ng "Bisalog" o pagkakahalo ng wika na dapat iwasan.
4. Huwag mag-promise ng availability, discount, o delivery time kung hindi pa confirmed.
5. Kung kulang ang info — magtanong muna, pero natural ang pagtatanong, hindi parang form.
6. Palaging protektahan ang reputasyon ng Ai-ren Design Ads.
7. HUWAG MAG-GUESS O MAG-ASSUME: Kung hindi malinaw kung ano talaga ang gustong sabihin ng customer, o kung hindi ito clearly related sa isang product/service inquiry, HUWAG agad mag-alok o mag-pitch ng specific na product. Sa halip, mag-acknowledge lang nang simple o magtanong ng clarifying question. Halimbawa: kung sinabi ng customer na "lagi nag trainee pako" (palaging trainee lang siya), hindi ito automatic na tanong tungkol sa training jerseys — huwag mag-imbento ng koneksyon sa product, magtanong na lang kung ano talaga ang kailangan niya.
8. Kung sinabi ng customer na wala silang sariling design, o humihingi ng design ideas/samples/reference, o nagtatanong kung may makikita silang design options — i-share ang aming website na https://airendesignads.com kung saan makikita nila ang mga design at product samples. LAGING ILAGAY ANG BUONG LINK KASAMA ANG "https://" (hindi lang "airendesignads.com") para naging clickable/auto-link ito sa Messenger at direktang ma-redirect ang customer papunta sa website. Sabihin ito nang natural, hindi parang ad, hal.: "Puwede mo pong i-check ang https://airendesignads.com para makakita ka ng mga design namin, tapos pili ka na lang kung alin ang gusto mo" o "Meron kaming website, https://airendesignads.com, doon mo makikita yung mga design samples namin." Huwag ulit-ulitin ang pag-share ng link kung nasabi na ito sa parehong usapan.
9. Kung nagtatanong ng oras ng negosyo (open/close, anong oras kayo bukas, atbp.) — sagutin nang direkta gamit ang impormasyon sa COMPANY BACKGROUND (Lunes-Sabado, 9AM-6PM, sarado Linggo/holiday).
10. You define, we design! ✨`;

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
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);
      return {
        text: "Hala sorry, medyo nag-lag yata connection ko. Pwede mo bang i-ulit yung message mo? 😊",
        ok: false,
      };
    }

    const replyText = data.choices?.[0]?.message?.content;

    if (!replyText) {
      console.error("Groq API returned empty content:", data);
      return {
        text: "Hala sorry, medyo nag-lag yata connection ko. Pwede mo bang i-ulit yung message mo? 😊",
        ok: false,
      };
    }

    return { text: replyText, ok: true };
  } catch (err) {
    console.error("Groq API request failed:", err);
    return {
      text: "Hala sorry, medyo nag-lag yata connection ko. Pwede mo bang i-ulit yung message mo? 😊",
      ok: false,
    };
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

      // FIX #1: Kapag human agent (page admin) ang sumagot sa Messenger (echo event),
      // i-save na natin yung ACTUAL na content ng sagot niya bilang activity,
      // hindi lang yung timestamp. Kung hindi ito ise-save, mawawala ito sa
      // conversationHistory at hindi malalaman ng AI kung ano na yung
      // huling tinutukoy/na-establish na sa usapan (e.g. "vehicle graphics")
      // kaya nagkakamali ito ng context sa mga susunod na sagot (hallucination).
      if (isEcho && senderId) {
        try {
          await prisma.activity.create({
            data: {
              leadId: senderId,
              type: "message",
              note: "", // walang bagong customer message dito, echo lang ng human reply
              aiReply: messageText || "",
            },
          });

          await prisma.lead.update({
            where: { id: senderId },
            data: { lastHumanReply: new Date() },
          });
        } catch (err) {
          console.error("Error saving human reply / updating lastHumanReply:", err);
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

        // FIX #2: dating orderBy: "asc" + take: 10 ay kinukuha yung PINAKALUMANG
        // 10 messages sa buong history ng lead, hindi yung pinakabago. Kaya kapag
        // lumagpas na sa 10 messages yung total na usapan, palagi na lang "stuck"
        // yung AI sa unang mga message at nawawala yung kasalukuyang konteksto.
        // Fix: kunin yung pinakahuling 10 (desc), tapos i-reverse papunta sa
        // tamang pagkakasunod-sunod (chronological) bago ipasa sa AI.
        const previousActivities = await prisma.activity.findMany({
          where: { leadId: senderId, type: "message" },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        previousActivities.reverse();

        const conversationHistory = previousActivities
          .flatMap((activity) => {
            const entries = [];
            // note pwedeng blangko kapag echo/human-reply-only na entry (walang bagong customer msg)
            if (activity.note) {
              entries.push({ role: "user", content: activity.note });
            }
            if (activity.aiReply) {
              entries.push({ role: "assistant", content: activity.aiReply });
            }
            return entries;
          });

        // Greeting rule: bagong usapan pa lang (walang history) o lumipas na ng
        // isang linggo (7+ days) mula sa huling activity ng lead -> pwede mag-greet.
        // Kung ongoing/kamakailan lang nag-usap -> huwag na mag-greeting expressions.
        let allowGreeting = true;
        if (previousActivities.length > 0) {
          const lastActivity = previousActivities[previousActivities.length - 1];
          const daysSinceLastActivity =
            (new Date() - new Date(lastActivity.createdAt)) / (1000 * 60 * 60 * 24);
          allowGreeting = daysSinceLastActivity >= 7;
        }

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
          const { text: aiReply, ok: aiOk } = await getGroqReply(messageText, conversationHistory, allowGreeting);

          await prisma.activity.create({
            data: {
              leadId: senderId,
              type: "message",
              note: messageText,
              // Kapag hindi successful (fallback), HUWAG i-save sa aiReply
              // para hindi ito bumalik bilang parte ng conversationHistory
              // sa susunod na messages (dati dito galing yung "paulit-ulit" na error).
              ...(aiOk ? { aiReply } : {}),
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
