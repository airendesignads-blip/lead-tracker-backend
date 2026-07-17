import { getMessengerProfile } from "@/lib/facebook";
import prisma from "@/lib/prisma";

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

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
          await prisma.activity.create({
            data: {
              leadId: senderId,
              type: "message",
              note: "",
              aiReply: messageText || "",
            },
          });
          await prisma.lead.update({
            where: { id: senderId },
            data: { lastHumanReply: new Date() },
          });
        } catch (err) {
          console.error("Error saving human reply:", err);
        }
        continue;
      }

      if (!isEcho && senderId && messageText) {
        const profile = await getMessengerProfile(senderId);
        const name = profile?.name
          || (profile?.first_name || profile?.last_name
              ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
              : null)
          || "Facebook User";

        try {
          await prisma.lead.upsert({
            where: { id: senderId },
            update: { updatedAt: new Date(), stage: "Bagong Lead", name },
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

        try {
          await prisma.activity.create({
            data: {
              leadId: senderId,
              type: "message",
              note: messageText,
            },
          });
        } catch (err) {
          console.error("Error saving activity:", err);
        }

        console.log(`[webhook] Message from ${name} (${senderId})`);
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
