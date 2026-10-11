import "./globals.css";

export const metadata = { title: "Secure Login" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="wrap">
          <div className="brand">
            <span className="brand-mark">🔐</span> Secure Login
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
