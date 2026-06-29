import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const activeLeads = await prisma.lead.findMany({
    where: { stage: "New Lead" },
    include: { activities: true },
  });

  const toArchive = activeLeads.filter((lead) => {
    const activities = lead.activities || [];
    if (activities.length === 0) return false;

    const last = activities[activities.length - 1];
    const isReplied = last.aiReply === true;
    const isOld = new Date(last.createdAt) < oneDayAgo;

    return isReplied && isOld;
  });

  const ids = toArchive.map((l) => l.id);

  if (ids.length > 0) {
    await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: { stage: "Done" },
    });
  }

  return NextResponse.json({ archived: ids.length });
}
