import { TUserRole } from "./user";

export type TActivityLog = {
  id: string;
  actorId?: string | null;
  actorRole?: TUserRole | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};