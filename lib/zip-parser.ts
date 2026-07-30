/**
 * ZIP Import Parser — lib/zip-parser.ts
 *
 * Uses fflate for fast, non-blocking ZIP extraction (auto Web Worker).
 * Parses the definitive ClassPulse ZIP structure:
 *
 *   import.zip/
 *   └── students/
 *       ├── Riya Mehta/          ← folder name = student name
 *       │   ├── profile.jpg      ← profile photo (name starts with "profile")
 *       │   ├── photo1.jpg       ← additional face photos
 *       │   └── info.json        ← optional profile details
 *       └── 01_Aryan Singh/      ← {roll}_{name} for uniqueness/duplicates
 *           ├── profile.png
 *           └── info.json
 */

import { unzip } from "fflate";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ParsedStudent {
  /** Name from info.json or folder name (trimmed) */
  name: string;
  rollNumber: string | null;
  email: string | null;
  batch: string | null;
  section: string | null;
  phone: string | null;
  /** All extra fields from info.json that don't map to structured columns */
  extraFields: Record<string, string>;
  /** Up to 3 image Files — profile.* first, then others */
  photos: File[];
  profilePhotoIndex: number; // index in photos[] that is the profile photo (0 if present)
  /** Original folder name (for duplicate detection display) */
  folderName: string;
}

export interface ParseError {
  message: string;
  folderName?: string;
}

export interface ParseResult {
  students: ParsedStudent[];
  /** Students that share a name (case-insensitive) — need UI resolution */
  duplicates: Array<{ name: string; indices: number[] }>;
  errors: ParseError[];
  totalFolders: number;
}

// ── Known structured columns ──────────────────────────────────────────────────
// Everything else from info.json goes into extraFields

const STRUCTURED_KEYS = new Set([
  "name", "full_name", "student_name",
  "roll_number", "roll", "roll_no",
  "email", "email_address",
  "batch", "class",
  "section",
  "phone", "mobile", "phone_number",
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "bmp"]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function ext(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase();
}

function isImage(name: string): boolean {
  return IMAGE_EXTENSIONS.has(ext(name));
}

function mimeType(name: string): string {
  const e = ext(name);
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "png")  return "image/png";
  if (e === "webp") return "image/webp";
  if (e === "bmp")  return "image/bmp";
  return "image/jpeg";
}

/** Parse "01_Riya Mehta" → { roll: "01", name: "Riya Mehta" }
 *  or "Riya Mehta" → { roll: null, name: "Riya Mehta" }
 */
function parseFolderName(folder: string): { name: string; roll: string | null } {
  const match = folder.match(/^(\d+)[_\s-]+(.+)$/);
  if (match) return { roll: match[1], name: match[2].trim() };
  return { name: folder.trim(), roll: null };
}

/** Normalise an info.json field key to lowercase-underscore */
function normaliseKey(k: string): string {
  return k.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

// ── Main parser ────────────────────────────────────────────────────────────────

export async function parseZip(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const uint8  = new Uint8Array(buffer);

  return new Promise((resolve) => {
    unzip(uint8, (err, files) => {
      if (err) {
        resolve({ students: [], duplicates: [], errors: [{ message: err.message }], totalFolders: 0 });
        return;
      }

      // Collect all paths
      const allPaths = Object.keys(files);

      // Find the students/ root — accept with or without a top-level ZIP folder
      // e.g. "students/Riya Mehta/profile.jpg" or "MySchool/students/Riya Mehta/profile.jpg"
      const studentsRoot = (() => {
        for (const path of allPaths) {
          const match = path.match(/^(.*\/)?students\//i);
          if (match) return match[0]; // e.g. "students/" or "MySchool/students/"
        }
        return null;
      })();

      if (!studentsRoot) {
        resolve({
          students: [],
          duplicates: [],
          errors: [{ message: 'No "students/" folder found in this ZIP. Make sure your ZIP has a folder called "students" containing one subfolder per student.' }],
          totalFolders: 0,
        });
        return;
      }

      // Group files by student folder (first path segment inside students/)
      const byFolder = new Map<string, { path: string; data: Uint8Array }[]>();

      for (const [path, data] of Object.entries(files)) {
        if (!path.startsWith(studentsRoot)) continue;
        const relative = path.slice(studentsRoot.length); // e.g. "Riya Mehta/profile.jpg"
        const slash    = relative.indexOf("/");
        if (slash === -1) continue; // file directly in students/ — skip
        const folder   = relative.slice(0, slash);
        const filename = relative.slice(slash + 1);
        if (!filename) continue; // it's the folder entry itself

        if (!byFolder.has(folder)) byFolder.set(folder, []);
        byFolder.get(folder)!.push({ path: filename, data });
      }

      const totalFolders = byFolder.size;
      const students: ParsedStudent[] = [];
      const errors: ParseError[]     = [];

      for (const [folderName, entries] of byFolder.entries()) {
        try {
          const { name: folderNameParsed, roll: folderRoll } = parseFolderName(folderName);

          // Find info.json
          const infoEntry = entries.find(e => e.path.toLowerCase() === "info.json");
          let info: Record<string, string> = {};
          if (infoEntry) {
            try {
              const text = new TextDecoder().decode(infoEntry.data);
              const raw  = JSON.parse(text) as Record<string, unknown>;
              info = Object.fromEntries(
                Object.entries(raw).map(([k, v]) => [normaliseKey(k), String(v ?? "").trim()])
              );
            } catch {
              errors.push({ message: `info.json in "${folderName}" is not valid JSON — skipped`, folderName });
            }
          }

          // Resolve structured fields (info.json overrides folder-derived values)
          const name =
            info["name"] || info["full_name"] || info["student_name"] || folderNameParsed;
          if (!name) continue;

          const rollNumber  = info["roll_number"] || info["roll"] || info["roll_no"] || folderRoll || null;
          const email       = info["email"] || info["email_address"] || null;
          const batch       = info["batch"] || info["class"] || null;
          const section     = info["section"] || null;
          const phone       = info["phone"] || info["mobile"] || info["phone_number"] || null;

          // Everything else → extraFields
          const extraFields: Record<string, string> = {};
          for (const [k, v] of Object.entries(info)) {
            if (!STRUCTURED_KEYS.has(k) && v) extraFields[k] = v;
          }

          // Collect image files — profile.* first, then others (max 3 total)
          const imageEntries = entries.filter(e => isImage(e.path) && !e.path.includes("/"));
          const profileEntries = imageEntries.filter(e =>
            e.path.toLowerCase().startsWith("profile.")
          );
          const otherEntries   = imageEntries.filter(e =>
            !e.path.toLowerCase().startsWith("profile.")
          );
          const ordered = [...profileEntries, ...otherEntries].slice(0, 3);

          const photos: File[] = ordered.map(e =>
            new File([e.data.buffer.slice(e.data.byteOffset, e.data.byteOffset + e.data.byteLength) as ArrayBuffer], e.path, { type: mimeType(e.path) })
          );

          students.push({
            name,
            rollNumber,
            email,
            batch,
            section,
            phone,
            extraFields,
            photos,
            profilePhotoIndex: 0,
            folderName,
          });
        } catch (e) {
          errors.push({ message: `Error processing "${folderName}": ${(e as Error).message}`, folderName });
        }
      }

      // Detect duplicates (same name, case-insensitive)
      const nameMap = new Map<string, number[]>();
      students.forEach((s, i) => {
        const key = s.name.toLowerCase().trim();
        if (!nameMap.has(key)) nameMap.set(key, []);
        nameMap.get(key)!.push(i);
      });

      const duplicates = Array.from(nameMap.entries())
        .filter(([, indices]) => indices.length > 1)
        .map(([name, indices]) => ({ name, indices }));

      resolve({ students, duplicates, errors, totalFolders });
    });
  });
}
