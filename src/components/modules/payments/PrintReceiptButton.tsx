"use client";

import { Printer } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  /** Click handler — usually calls window.print() or opens a dialog. */
  onPrint: () => void;
  label?: string;
  /** When true, renders a square icon-only button suitable for table rows. */
  iconOnly?: boolean;
} & Omit<ButtonProps, "onClick" | "children">;

/**
 * Triggers the print dialog. The receipt itself is rendered elsewhere in the
 * tree (so its data can be reactive); the global @media print stylesheet
 * isolates it during printing.
 */
const PrintReceiptButton = ({
  onPrint,
  label = "Print Receipt",
  iconOnly = false,
  className,
  ...rest
}: Props) => {
  return (
    <Button
      type="button"
      variant={iconOnly ? "outline" : "default"}
      size={iconOnly ? "icon" : "default"}
      onClick={onPrint}
      title={label}
      aria-label={label}
      className={cn(className)}
      {...rest}
    >
      <Printer className={cn(iconOnly ? "h-4 w-4" : "h-4 w-4", !iconOnly && "mr-2")} />
      {!iconOnly && label}
    </Button>
  );
};

export default PrintReceiptButton;
