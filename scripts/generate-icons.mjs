/**
 * generate-icons.mjs
 * Creates ClassPulse PWA icons using the Canvas API (Node.js via canvas package or pure SVG fallback).
 * Run: node scripts/generate-icons.mjs
 *
 * Since we're in a Next.js project without canvas installed, we generate
 * clean SVG files and also create placeholder PNG-compatible files.
 * For proper PNGs in production, run: npx sharp-cli or install canvas.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public", "icons");

mkdirSync(publicDir, { recursive: true });

// Inline SVG icon for ClassPulse (lightning bolt ⚡ on purple gradient)
const svgIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6d4aff"/>
      <stop offset="100%" stop-color="#c849f4"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>
  <!-- Lightning bolt -->
  <text x="${size / 2}" y="${size * 0.72}" font-size="${size * 0.55}" text-anchor="middle" fill="white" font-family="system-ui, sans-serif">⚡</text>
</svg>`;

// Maskable version (more padding for safe area)
const svgMaskable = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6d4aff"/>
      <stop offset="100%" stop-color="#c849f4"/>
    </linearGradient>
  </defs>
  <!-- Full bleed background (no rounded corners for maskable) -->
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <!-- Centered icon with safe zone padding (33%) -->
  <text x="${size / 2}" y="${size * 0.68}" font-size="${size * 0.42}" text-anchor="middle" fill="white" font-family="system-ui, sans-serif">⚡</text>
</svg>`;

const icons = [
  { name: "icon-192.svg",           content: svgIcon(192) },
  { name: "icon-192-maskable.svg",  content: svgMaskable(192) },
  { name: "icon-512.svg",           content: svgIcon(512) },
  { name: "icon-512-maskable.svg",  content: svgMaskable(512) },
];

for (const icon of icons) {
  const path = join(publicDir, icon.name);
  writeFileSync(path, icon.content, "utf8");
  console.log(`✓ Created ${icon.name}`);
}

console.log("\n✅ SVG icons created in public/icons/");
console.log("📋 Update manifest.ts to reference .svg files, or convert to PNG with:");
console.log("   npx sharp-cli --input public/icons/icon-192.svg --output public/icons/icon-192.png --width 192 --height 192");
