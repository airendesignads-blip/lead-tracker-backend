// lib/supabase.js
// A server-side-only Supabase client for the Lead Tracker app, used ONLY to
// mirror payments into the main website's `crm_payments` table so they show
// up in Job Order History / Sales Report. Everything else in this app still
// uses Prisma — this is a bridge, not a replacement.
//
// Add these two env vars in Vercel (Project Settings > Environment Variables)
// for the lead-tracker-backend project, using values from the SAME Supabase
// project the main website uses (Project Settings > API):
//   SUPABASE_URL=https://bcvnlcvfsgocjvaookmq.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=<service role key, NOT the anon key>

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
