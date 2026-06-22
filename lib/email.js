// lib/email.js
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

export async function sendAutoReplyEmail(toEmail, leadName = "") {
  if (!toEmail) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: toEmail,
      subject: "Salamat sa iyong inquiry!",
      html: `<p>Hi ${leadName || "there"},</p><p>Salamat sa pag-message mo sa amin! May sasagot sa iyo within 24 hours.</p><p>Salamat,<br/>Ang Team</p>`,
    }),
  });
  if (!res.ok) {
    console.error("Resend error:", await res.text());
    return false;
  }
  return true;
}
