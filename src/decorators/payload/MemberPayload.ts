import { tags } from "typia";

/**
 * JWT Payload for authenticated 'member' role users
 *
 * - `id`: Top-level user account UUID (discuss_board_user_accounts.id)
 * - `type`: Discriminator for role type (should be "member")
 */
export interface MemberPayload {
  /** Unique global User Account ID (discuss_board_user_accounts.id) */
  id: string & tags.Format<"uuid">;

  /** Role discriminator (must be "member" for this payload/interface). */
  type: "member";
}
