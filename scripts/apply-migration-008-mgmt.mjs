/**
 * apply-migration-008-mgmt.mjs
 * Applies Migration 008 via Supabase Management API.
 * This is the official way to run SQL on a remote project without a DB password.
 *
 * Requires: SUPABASE_ACCESS_TOKEN (personal access token from supabase.com/dashboard/account/tokens)
 * Project ref: djmivnrzdtzroramgcpa
 *
 * Run: node scripts/apply-migration-008-mgmt.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Check for access token in environment or .env.local
const envPath = join(__dirname, "..", ".env.local");
const env = readFileSync(envPath, "utf8");
const getEnv = (key) => {
  const match = env.match(new RegExp(`^${key}=(.+)$`, "m"));
  return match ? match[1].trim() : null;
};

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || getEnv("SUPABASE_ACCESS_TOKEN");
const PROJECT_REF  = "djmivnrzdtzroramgcpa";

if (!ACCESS_TOKEN) {
  console.error("❌ SUPABASE_ACCESS_TOKEN not set.");
  console.error("\nTo get your personal access token:");
  console.error("  1. Go to https://supabase.com/dashboard/account/tokens");
  console.error("  2. Create a new token");
  console.error("  3. Run: $env:SUPABASE_ACCESS_TOKEN='your_token' ; node scripts/apply-migration-008-mgmt.mjs");
  process.exit(1);
}

// Read SQL
const sqlPath = join(__dirname, "..", "supabase", "migrations", "202607290008_photo_lock_and_history.sql");
const sql = readFileSync(sqlPath, "utf8");

console.log("🚀 Applying Migration 008 via Supabase Management API...");
console.log(`   Project: ${PROJECT_REF}`);

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${ACCESS_TOKEN}`
  },
  body: JSON.stringify({ query: sql })
});

const body = await res.text();
if (res.ok) {
  console.log("✅ Migration 008 applied successfully!");
  console.log(body);
} else {
  console.error(`❌ Failed (HTTP ${res.status}):`);
  console.error(body);
  process.exit(1);
}
