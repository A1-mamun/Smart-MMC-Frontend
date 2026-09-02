import dayjs from "dayjs";

/**
 * Generate a human-readable receipt number from a payment id and paidAt date.
 * Format: RCP-YYYYMM-XXXXXX where XXXXXX is the first 6 chars of the payment id
 * (uppercased, alphanumeric). The payment id is a UUID so the leading segment
 * is always alphanumeric and stable across requests.
 *
 * Example: payment id "cm2x9abc-def0-…" paid in Sept 2026 → "RCP-202609-CM2X9A"
 */
export const formatReceiptNumber = (
  paymentId: string,
  paidAt?: string | null,
): string => {
  const date = paidAt ? dayjs(paidAt) : dayjs();
  const yyyymm = date.isValid() ? date.format("YYYYMM") : dayjs().format("YYYYMM");
  const slug = (paymentId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6)
    .padEnd(6, "X");
  return `RCP-${yyyymm}-${slug}`;
};
