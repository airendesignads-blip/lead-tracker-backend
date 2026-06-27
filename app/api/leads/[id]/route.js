import prisma from "@/lib/prisma";

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { stage } = body;

    const lead = await prisma.lead.update({
      where: { id },
      data: { stage },
    });

    return Response.json(lead);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
