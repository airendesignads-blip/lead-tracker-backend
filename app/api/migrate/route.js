import prisma from "@/lib/prisma";

export async function GET() {
  await prisma.$executeRaw`
    ALTER TABLE "Lead" 
    ADD COLUMN IF NOT EXISTS "lastHumanReply" TIMESTAMP;
  `;
  return new Response("Migration done!", { status: 200 });
}
