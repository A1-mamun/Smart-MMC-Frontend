/**
 * Server-side proxy for the backend's `POST /attendance/check-in`.
 *
 * The real backend endpoint is gated by a shared `x-device-secret`
 * header. We used to inline the secret into the client bundle as
 * `NEXT_PUBLIC_DEVICE_SECRET`, which leaked it to anyone who opened
 * DevTools on the kiosk page. To avoid that, the kiosk now calls
 * THIS same-origin route; we read `DEVICE_SECRET` from the
 * server-side env (no `NEXT_PUBLIC_` prefix → never reaches the
 * client bundle) and forward the request to the backend with the
 * header attached.
 *
 * If the server-side secret is missing, we fail closed (500) rather
 * than silently forwarding without auth — that would let unauth'd
 * calls reach the backend.
 */
import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_BASE_URL;
const DEVICE_SECRET = process.env.DEVICE_SECRET;

export async function POST(request: Request) {
  if (!BACKEND_BASE) {
    return NextResponse.json(
      { success: false, message: "BACKEND_BASE_URL is not configured" },
      { status: 500 },
    );
  }
  if (!DEVICE_SECRET) {
    return NextResponse.json(
      { success: false, message: "DEVICE_SECRET is not configured" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const upstream = await fetch(`${BACKEND_BASE}/attendance/check-in`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-device-secret": DEVICE_SECRET,
    },
    body: JSON.stringify(body),
    // Don't cache — attendance is write-once and we want errors to
    // surface to the kiosk immediately.
    cache: "no-store",
  });

  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
