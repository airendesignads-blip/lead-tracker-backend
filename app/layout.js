export const metadata = {
  title: "Lead Tracker CRM",
  description: "Simple CRM with Facebook Messenger and email autoreply",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
