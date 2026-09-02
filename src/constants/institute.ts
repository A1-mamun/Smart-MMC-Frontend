/**
 * Institute metadata used on payment receipts.
 * Values fall back to defaults so the receipt still works in any deployment,
 * but operators can override them via NEXT_PUBLIC_* env vars in `.env.local`.
 */
export const instituteInfo = {
  name: process.env.NEXT_PUBLIC_INSTITUTE_NAME || "Mehedi Math Care",
  address: process.env.NEXT_PUBLIC_INSTITUTE_ADDRESS || "Gononagar, Rajshahi",
  phone: process.env.NEXT_PUBLIC_INSTITUTE_PHONE || "01784475710 | 01766210821",
  email: process.env.NEXT_PUBLIC_INSTITUTE_EMAIL || "",
};
