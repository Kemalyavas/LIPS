export type PostStatus =
  | "PENDING_REVIEW"
  | "SUITABLE"
  | "NOT_SUITABLE"
  | "DRAFT_GENERATED"
  | "IN_REVIEW"
  | "READY"
  | "COMMENTED"
  | "SKIPPED";

export type UserRole = "ADMIN" | "OWNER";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
