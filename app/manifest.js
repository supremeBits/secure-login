export default function manifest() {
  return {
    name: "Secure Tasks",
    short_name: "Tasks",
    description: "A secure to-do app with two-step login and roles.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#efe9ff",
    theme_color: "#6c3bff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
