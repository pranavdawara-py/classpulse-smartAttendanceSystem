import type { MetadataRoute } from "next";

/**
 * PWA manifest for Android home-screen installation.
 * Android Chrome uses this to enable "Add to Home Screen" / install prompt.
 * Ensure icons are added to /public/icons/ before the first demo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClassPulse — Smart Attendance",
    short_name: "ClassPulse",
    description:
      "AI-assisted, teacher-confirmed attendance for schools and colleges.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f0922",
    theme_color: "#6d4aff",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
