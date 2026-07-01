import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  const tenMinutesAgo = new Date();
  tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const activeLeads = await prisma.lead.findMany({
    where: { stage: { notIn: ["Facebook Done", "Email Done"] } },
    include: { activities: true },
  });

  const toArchive = activeLeads.filter((lead) => {
    const activities = lead.activities || [];
    if (activities.length === 0) return false;

    const last = activities[activities.length - 1];
    if (!last.aiReply) return false;

    const lastTime = new Date(last.createdAt);

    if (lead.source === "facebook") return lastTime < tenMinutesAgo;
    if (lead.source === "email") return lastTime < twoDaysAgo;

    return false;
  });

  for (const lead of toArchive) {
    const newStage = lead.source === "facebook" ? "Facebook Done" : "Email Done";
    await prisma.lead.update({
      where: { id: lead.id },
      data: { stage: newStage },
    });
  }

  return NextResponse.json({ archived: toArchive.length });
}
