import { tags } from "typia";

/**
 * ModeratorPayload: Information extracted for JWT-moderator authentication.
 *
 * - Id: Always the top-level user_account id (discuss_board_user_accounts.id)
 * - Type: Must be 'moderator'
 */
export interface ModeratorPayload {
  /** Top-level user_account table ID (UUID). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for union. */
  type: "moderator";
}
