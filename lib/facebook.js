// lib/facebook.js
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

export async function sendMessengerReply(recipientId, text) {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });
  if (!res.ok) console.error("Facebook send error:", await res.text());
  return res.ok;
}

export async function getMessengerProfile(senderId) {
  const url = `https://graph.facebook.com/${senderId}?fields=name,first_name,last_name&access_token=${PAGE_ACCESS_TOKEN}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data;
  } catch {
    return null;
  }
}
