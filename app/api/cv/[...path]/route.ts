/**
 * Next.js proxy for the ClassPulse CV backend (FastAPI on localhost:8000).
 * This avoids CORS issues when the browser talks to the Python backend.
 *
 * All requests to /api/cv/... are forwarded to http://localhost:8000/...
 * e.g. POST /api/cv/recognize → POST http://localhost:8000/recognize
 */

import { NextRequest, NextResponse } from "next/server";

const CV_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params);
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const subPath = params.path?.join("/") ?? "";
  const targetUrl = `${CV_BASE}/${subPath}`;

  // Forward request to FastAPI
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    // Never trust a browser-supplied credential for the backend.
    if (normalizedKey !== "host" && normalizedKey !== "authorization") {
      headers.set(key, value);
    }
  });

  const backendApiKey = process.env.BACKEND_API_KEY;
  if (backendApiKey) {
    headers.set("Authorization", `Bearer ${backendApiKey}`);
  }

  let body: BodyInit | null = null;
  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(targetUrl, { method, headers, body });
    const data = await upstream.arrayBuffer();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: "CV backend unreachable. Make sure start.bat is running." },
      { status: 503 }
    );
  }
}
