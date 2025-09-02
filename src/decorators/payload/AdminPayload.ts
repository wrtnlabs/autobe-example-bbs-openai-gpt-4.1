import { tags } from "typia";

/** Payload injected for an authenticated Admin session */
export interface AdminPayload {
  /** Top-level user table ID (discussion_board_users.id) */
  id: string & tags.Format<"uuid">;
  /** Role discriminator (always 'admin') */
  type: "admin";
}
