import { tags } from "typia";

/**
 * Authenticated administrator JWT payload.
 *
 * - Id: Top-level user account ID (discuss_board_user_accounts.id)
 * - Type: Discriminator for administrator role
 */
export interface AdministratorPayload {
  /** Top-level user account ID */
  id: string & tags.Format<"uuid">;
  /** Discriminator for administrator union type */
  type: "administrator";
}
