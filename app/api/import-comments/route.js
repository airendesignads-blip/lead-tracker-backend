import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  const pageId = process.env.FB_PAGE_ID;
  const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return NextResponse.json({ error: "Missing FB credentials" }, { status: 500 });
  }

  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  const postsRes = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,story,created_time&since=${since}&limit=100&access_token=${accessToken}`
  );
  const postsData = await postsRes.json();
  const posts = postsData.data || [];

  let imported = 0;

  for (const post of posts) {
    const postTitle = post.message?.slice(0, 80) || post.story || "Facebook Post";
    const postId = post.id;

    const commentsRes = await fetch(
      `https://graph.facebook.com/v19.0/${postId}/comments?fields=id,message,from&limit=100&access_token=${accessToken}`
    );
    const commentsData = await commentsRes.json();
    const comments = commentsData.data || [];

    for (const comment of comments) {
      const commenterId = comment.from?.id;
      const commenterName = comment.from?.name || "Facebook Commenter";
      const commentText = comment.message || "";

      if (!commenterId || !commentText) continue;

      const leadId = `fb_comment_${commenterId}`;

      try {
        await prisma.lead.upsert({
          where: { id: leadId },
          update: { updatedAt: new Date(), comment: commentText, postId, postTitle },
          create: {
            id: leadId,
            name: commenterName,
            source: "facebook",
            postId,
            postTitle,
            comment: commentText,
            activities: {
              create: {
                type: "comment",
                note: `Commented on "${postTitle}": ${commentText}`,
              },
            },
          },
        });
        imported++;
      } catch (err) {
        console.error("Error saving comment:", err);
      }
    }
  }

  return NextResponse.json({ imported });
}
