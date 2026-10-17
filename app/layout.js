import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata = {
  title: "Secure Tasks",
  description: "A secure to-do app with two-step login and roles.",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "Tasks", statusBarStyle: "default" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6c3bff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
