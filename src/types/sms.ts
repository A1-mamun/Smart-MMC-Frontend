/**
 * SMS send mode controls how the request is logged and surfaced in the UI.
 *   ONE_TO_ONE   → single recipient (e.g. clicked from a student row)
 *   ONE_TO_MANY  → many recipients (e.g. picked from a filtered cohort)
 */
export type TSmsMode = "ONE_TO_ONE" | "ONE_TO_MANY";

export type TSmsRecipient = {
  studentId: string;
  name: string;
  mobile: string;
};

export type TSendSmsPayload = {
  mode: TSmsMode;
  recipients: TSmsRecipient[];
  message: string;
};

export type TSmsLogStatus = "PENDING" | "SUCCESS" | "FAILED";

export type TSmsLog = {
  id: string;
  recipients: string; // CSV of normalised numbers
  message: string;
  status: TSmsLogStatus;
  upstreamCode: string | null;
  errorMsg: string | null;
  count: number;
  mode: TSmsMode;
  sentById: string;
  createdAt: string;
  sentBy?: { id: string; name: string; role: string } | null;
};

export type TSmsSendResult = {
  log: TSmsLog;
  skipped: { studentId: string; name: string; raw: string }[];
  upstreamCode: string;
};

export type TSmsBalance = {
  balance: number;
  raw: string;
  fetchedAt: string;
};