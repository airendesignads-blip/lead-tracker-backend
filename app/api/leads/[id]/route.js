// app/api/leads/[id]/payment/route.js
import prisma from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

export async function POST(request, { params }) {
  const { id } = params;
  const { amount, mode, leadName } = await request.json();

  if (!amount || Number(amount) <= 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!mode) {
    return Response.json({ error: "Mode of payment is required" }, { status: 400 });
  }

  try {
    // 1) Keep a record on the lead itself (Prisma) so it shows in its activity history.
    await prisma.activity.create({
      data: {
        leadId: id,
        type: "payment",
        note: `Payment received: ₱${Number(amount).toLocaleString()} via ${mode}`,
      },
    });

    // 2) Mirror it into Supabase so it shows in Job Order History / Sales Report
    //    on the main website. If this fails, the payment is still saved above —
    //    we don't want a Supabase hiccup to lose the Prisma record.
    const { error: sbError } = await supabase.from("crm_payments").insert({
      lead_id: id,
      lead_name: leadName || "Facebook Lead",
      amount: Number(amount),
      mode_of_payment: mode,
      source: "Payment from CRM",
    });
    if (sbError) console.error("Supabase mirror failed:", sbError);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Error saving payment:", err);
    return Response.json({ error: "Could not save payment" }, { status: 500 });
  }
}
