"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaymentReceipt from "@/components/modules/payments/PaymentReceipt";
import { printPaymentReceipt } from "@/utils/printReceipt";
import type { TPaymentRecord } from "@/types/payment";

type Props = {
  payment: TPaymentRecord;
  studentName: string;
  studentId: string;
  studentMobile?: string;
  studentBatch?: string;
  paymentStatus?: "PAID" | "PARTIAL" | "PENDING";
  courseName?: string;
  fee?: number;
  previouslyPaid?: number;
  collectedByName?: string;
  collectedByRole?: string;
  /** Called when the user clicks "Back" to return to the previous screen. */
  onBack: () => void;
};

/**
 * Full-page receipt view shown after a successful payment. The receipt is
 * rendered on screen for review; when the user clicks "Print", the receipt
 * is rendered into an off-screen iframe (which inherits the parent's CSS)
 * and that iframe's print dialog is opened — guaranteeing the printed page
 * contains only the receipt regardless of the app's layout.
 */
const PaymentReceiptView = ({
  payment,
  studentName,
  studentId,
  studentMobile,
  studentBatch,
  paymentStatus,
  courseName,
  fee,
  previouslyPaid,
  collectedByName,
  collectedByRole,
  onBack,
}: Props) => {
  const handlePrint = () => {
    printPaymentReceipt({
      payment,
      studentName,
      studentId,
      studentMobile,
      studentBatch,
      paymentStatus,
      courseName,
      fee,
      previouslyPaid,
      collectedByName,
      collectedByRole,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-100 overflow-y-auto">
      {/* Action bar — visible on screen only */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* On-screen preview only — the actual print uses the iframe. */}
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white shadow-sm">
          <PaymentReceipt
            payment={payment}
            studentName={studentName}
            studentId={studentId}
            studentMobile={studentMobile}
            studentBatch={studentBatch}
            paymentStatus={paymentStatus}
            courseName={courseName}
            fee={fee}
            previouslyPaid={previouslyPaid}
            collectedByName={collectedByName}
            collectedByRole={collectedByRole}
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentReceiptView;

