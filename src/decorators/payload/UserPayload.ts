import { tags } from "typia";

/**
 * Payload for standard authenticated users.
 *
 * @property id - Top-level user table ID (discussion_board_users.id).
 * @property type - Discriminator for the union type ('user').
 */
export interface UserPayload {
  /** Top-level user table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "user";
}
