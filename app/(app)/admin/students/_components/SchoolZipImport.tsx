"use client";

import { useState } from "react";
import ZipImportPanel, { type ParsedStudent } from "@/app/components/shared/ZipImportPanel";
import { importStudentsFromZip } from "@/app/actions/admin/students";

interface Props {
  onDone?: (created: number) => void;
}

export default function SchoolZipImport({ onDone }: Props) {
  const [show, setShow] = useState(false);

  async function handleImport(
    students: ParsedStudent[],
    password: string,
    onProgress: (done: number, total: number, name: string) => void
  ): Promise<{ created: number; errors: string[] }> {
    // Process in batches of 5 to avoid timeouts
    const BATCH = 5;
    let allCreated = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < students.length; i += BATCH) {
      const batch = students.slice(i, i + BATCH);
      onProgress(i, students.length, batch[0]?.name ?? "");
      const res = await importStudentsFromZip(batch, password);
      allCreated += res.created;
      allErrors.push(...res.errors);
    }

    onProgress(students.length, students.length, "");
    if (onDone) onDone(allCreated);
    return { created: allCreated, errors: allErrors };
  }

  return (
    <>
      <button
        onClick={() => setShow(true)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 12,
          border: "1.5px solid #6d4aff", background: "#f5f3ff",
          color: "#6d4aff", fontWeight: 700, fontSize: ".85rem", cursor: "pointer"
        }}
      >
        📦 Import ZIP
      </button>

      {show && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
          zIndex: 200, display: "flex", alignItems: "flex-start",
          justifyContent: "center", overflowY: "auto", padding: "24px 16px"
        }}>
          <div style={{
            background: "white", borderRadius: 20, width: "100%",
            maxWidth: 640, padding: "24px", boxShadow: "0 24px 60px rgba(0,0,0,.25)"
          }}>
            <ZipImportPanel
              mode="school"
              onImport={handleImport}
              onCancel={() => setShow(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
