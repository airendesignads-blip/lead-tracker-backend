import prisma from "@/lib/prisma";

const FB_PAGE_ID = "1678784839106037";
const FB_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

export async function POST() {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/conversations?fields=participants,messages{message,created_time,from}&access_token=${FB_ACCESS_TOKEN}&limit=100`
    );
    const data = await response.json();

    if (!data.data) {
      return Response.json({ error: "No conversations found", details: data }, { status: 400 });
    }

    let imported = 0;

    for (const conversation of data.data) {
      const participants = conversation.participants?.data || [];
      const customer = participants.find((p) => p.id !== FB_PAGE_ID);
      if (!customer) continue;

      const messages = conversation.messages?.data || [];

      await prisma.lead.upsert({
        where: { id: customer.id },
        update: { updatedAt: new Date() },
        create: {
          id: customer.id,
          name: customer.name || "Facebook Lead",
          source: "facebook",
        },
      });

      for (const msg of messages.reverse()) {
        if (msg.message) {
          const existing = await prisma.activity.findFirst({
            where: { leadId: customer.id, note: msg.message },
          });
          if (!existing) {
            await prisma.activity.create({
              data: {
                leadId: customer.id,
                type: "message",
                note: msg.message,
                aiReply: msg.from?.id === FB_PAGE_ID ? msg.message : null,
              },
            });
          }
        }
      }

      imported++;
    }

    return Response.json({ success: true, imported });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
