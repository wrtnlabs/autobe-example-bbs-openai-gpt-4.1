import { tags } from "typia";

/**
 * Moderator JWT Payload.
 *
 * - Id: Always discussion_board_users.id (top-level user identifier)
 * - Type: must be "moderator" (discriminator for role)
 */
export interface ModeratorPayload {
  /** Top-level user table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "moderator";
}
