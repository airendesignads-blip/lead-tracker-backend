import prisma from "@/lib/prisma";

// TEMPORARY CLEANUP ROUTE — para alisin ang mga lumang "aiReply" na
// naglalaman ng fallback error message (nag-contaminate sa AI context).
//
// PAANO GAMITIN: buksan lang sa browser ang URL na ito pagkatapos
// ma-deploy:  https://[your-domain]/api/cleanup-fallback
//
// IMPORTANTE: I-DELETE ang file na ito (at ang route) pagkatapos
// gamitin nang isang beses — hindi ito dapat manatili sa production
// dahil walang authentication/password protection.

const FALLBACK_PATTERNS = [
  "medyo nag-lag yata connection ko",
  "Salamat sa iyong message! Sandali lang ha",
];

export async function GET() {
  try {
    const allActivities = await prisma.activity.findMany({
      where: { aiReply: { not: null } },
      select: { id: true, aiReply: true },
    });

    const toClean = allActivities.filter((a) =>
      FALLBACK_PATTERNS.some((pattern) => a.aiReply?.includes(pattern))
    );

    for (const activity of toClean) {
      await prisma.activity.update({
        where: { id: activity.id },
        data: { aiReply: null },
      });
    }

    return new Response(
      JSON.stringify({
        message: "Cleanup done!",
        totalChecked: allActivities.length,
        cleaned: toClean.length,
        cleanedIds: toClean.map((a) => a.id),
      }, null, 2),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }, null, 2),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
