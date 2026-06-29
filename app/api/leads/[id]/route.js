import prisma from "@/lib/prisma";
import { sendAutoReplyEmail } from "@/lib/email";

export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
    include: { activities: true },
  });
  return Response.json(leads);
}

export async function POST(request) {
  const data = await request.json();
  const { name, company, email, phone, source = "website" } = data;
  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  const lead = await prisma.lead.create({
    data: { name, company, email, phone, source },
  });
  if (email) await sendAutoReplyEmail(email, name);
  return Response.json(lead, { status: 201 });
}

export async function PATCH(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const updatedLead = await prisma.lead.update({
    where: { id: id },
    data: body,
  });
  return Response.json(updatedLead);
}
