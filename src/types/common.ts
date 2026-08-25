export type TPaginationMeta = {
  page: number;
  limit: number;
  total: number;
};

export type TApiResponse<T> = {
  success: boolean;
  message: string;
  meta?: TPaginationMeta | null;
  data: T | null;
};