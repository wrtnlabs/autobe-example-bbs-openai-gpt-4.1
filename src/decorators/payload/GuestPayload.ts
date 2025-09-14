import { tags } from "typia";

/**
 * GuestPayload: JWT payload for temporary/unauthenticated guest user sessions
 *
 * - Id: top-level guest table ID (format: uuid)
 * - Type: always 'guest' discriminator
 */
export interface GuestPayload {
  /** Top-level guest table ID (the fundamental guest identifier in the system). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for the discriminated union type ('guest'). */
  type: "guest";
}
