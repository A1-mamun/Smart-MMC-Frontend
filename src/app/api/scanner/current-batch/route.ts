/**
 * Server-side proxy for the backend's `GET /attendance/current-batch`.
 *
 * Same shape as the `/check-in` proxy: the kiosk polls this route,
 * we attach the server-only `x-device-secret` header before
 * forwarding to the backend. See the `check-in` route for the full
 * rationale.
 */
import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_BASE_URL;
const DEVICE_SECRET = process.env.DEVICE_SECRET;

export async function GET() {
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

  const upstream = await fetch(`${BACKEND_BASE}/attendance/current-batch`, {
    method: "GET",
    headers: {
      "x-device-secret": DEVICE_SECRET,
    },
    cache: "no-store",
  });

  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
