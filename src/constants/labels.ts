export const formatBatchLabel = (value?: string | null) => {
  if (!value) return "—";
  return value.replace("BATCH_", "HSC ");
};

export const formatCourseLabel = (value?: string | null) => {
  if (!value) return "—";
  const map: Record<string, string> = {
    HSC_1ST_YEAR: "HSC 1st Year",
    HSC_2ND_YEAR: "HSC 2nd Year",
    HSC_FINAL_PREPARATION: "Final Preparation",
    ADMISSION: "Admission",
  };
  return map[value] || value;
};

export const formatBatchDayLabel = (value?: string | null) => {
  if (!value) return "—";
  return value;
};

export const formatBatchTimeLabel = (value?: string | null) => {
  if (!value) return "—";
  return value;
};

export const formatBloodGroupLabel = (value?: string | null) => {
  if (!value) return "—";
  return value.replace("_POSITIVE", "+").replace("_NEGATIVE", "-");
};

export const formatBoardLabel = (value?: string | null) => {
  if (!value) return "—";
  const map: Record<string, string> = {
    DHAKA: "Dhaka",
    CHITTAGONG: "Chittagong",
    RAJSHAHI: "Rajshahi",
    COMILLA: "Comilla",
    SYLHET: "Sylhet",
    BARISAL: "Barisal",
    JESSORE: "Jessore",
    MYMENSINGH: "Mymensingh",
    MADRASAH: "Madrasah",
    TECHNICAL: "Technical",
  };
  return map[value] || value;
};

export const formatPaymentMethodLabel = (value?: string | null) => {
  if (!value) return "—";
  const map: Record<string, string> = {
    CASH: "Cash",
    BKASH: "bKash",
    NAGAD: "Nagad",
    BANK: "Bank",
    OTHER: "Other",
  };
  return map[value] || value;
};