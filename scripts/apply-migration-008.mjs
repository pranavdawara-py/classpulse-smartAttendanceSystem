/**
 * apply-migration-008.mjs
 * Applies Migration 008 directly via Supabase Management API / REST.
 * Uses the service role key from .env.local — no DB password needed.
 *
 * Run: node scripts/apply-migration-008.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read env
const envPath = join(__dirname, "..", ".env.local");
const env = readFileSync(envPath, "utf8");
const getEnv = (key) => {
  const match = env.match(new RegExp(`^${key}=(.+)$`, "m"));
  return match ? match[1].trim() : null;
};

const SUPABASE_URL    = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY     = getEnv("SUPABASE_SECRET_KEY");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

// Read SQL migration file
const sqlPath = join(__dirname, "..", "supabase", "migrations", "202607290008_photo_lock_and_history.sql");
const sql = readFileSync(sqlPath, "utf8");

// Strip comments-only lines for cleaner output
const cleanSql = sql.replace(/^--.*$/gm, "").replace(/\n{3,}/g, "\n\n").trim();

console.log("🚀 Applying Migration 008 via Supabase REST API...");
console.log(`   Project: ${SUPABASE_URL}`);
console.log(`   SQL length: ${cleanSql.length} chars\n`);

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Prefer": "return=representation"
  },
  body: JSON.stringify({ sql: cleanSql })
});

if (!res.ok) {
  // Supabase doesn't expose exec_sql by default — try the pg extension approach
  console.log("⚠️  /rpc/exec_sql not available, trying statement-by-statement approach...\n");
  
  // Split into individual ALTER TABLE statements
  const statements = cleanSql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 5);

  let allOk = true;
  for (const stmt of statements) {
    const stmtRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ sql: stmt + ";" })
    });
    
    if (!stmtRes.ok) {
      const err = await stmtRes.text();
      console.error(`❌ Failed: ${stmt.slice(0, 80)}...\n   Error: ${err}`);
      allOk = false;
    } else {
      console.log(`✓ ${stmt.slice(0, 80).replace(/\s+/g, " ")}...`);
    }
  }
  
  if (!allOk) {
    console.log("\n⚠️  Some statements failed. This usually means exec_sql function doesn't exist.");
    console.log("   The migration needs to be applied manually in the Supabase Dashboard:");
    console.log("   https://supabase.com/dashboard/project/djmivnrzdtzroramgcpa/sql/new");
    console.log("\n   SQL to run:");
    console.log("─".repeat(60));
    console.log(cleanSql);
    console.log("─".repeat(60));
    process.exit(1);
  }
} else {
  const data = await res.json();
  console.log("✅ Migration 008 applied successfully!", data);
}
