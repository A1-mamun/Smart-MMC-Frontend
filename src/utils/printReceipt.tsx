"use client";

import { renderReceiptHTML, type TemplateProps } from "@/utils/receiptTemplate";

let activeIframe: HTMLIFrameElement | null = null;

/**
 * Render the receipt into a hidden off-screen iframe and call window.print()
 * on the iframe's contentWindow. The receipt is a self-contained HTML string
 * with inline styles (see renderReceiptHTML), so it is completely independent
 * of the parent document's CSS or Tailwind compilation state.
 *
 * This is the most reliable cross-browser print approach used by libraries
 * like react-to-print — the printed page contains only the receipt, no app
 * chrome, nav, or sidebars.
 */
export const printPaymentReceipt = (props: TemplateProps) => {
  if (typeof window === "undefined") return;

  cleanupIframe();

  const iframe = document.createElement("iframe");
  iframe.id = "print-receipt-iframe";
  // Position offscreen so it's never visible to the user.
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  activeIframe = iframe;

  const doc = iframe.contentDocument;
  if (!doc) {
    cleanupIframe();
    return;
  }

  const html = renderReceiptHTML(props);

  doc.open();
  doc.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Payment Receipt</title>
<style>
  @page { margin: 12mm; size: auto; }
  html, body { margin: 0; padding: 0; background: white; color: black; }
  * { box-sizing: border-box; }
</style>
</head>
<body>
${html}
</body>
</html>`);
  doc.close();

  // Wait two frames so the browser finishes laying out, then print.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        /* ignore */
      }
    });
  });

  iframe.contentWindow?.addEventListener?.("afterprint", cleanupIframe, {
    once: true,
  });
  setTimeout(cleanupIframe, 30000);
};

const cleanupIframe = () => {
  if (!activeIframe) return;
  const iframe = activeIframe;
  activeIframe = null;
  try {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  } catch {
    /* ignore */
  }
};
