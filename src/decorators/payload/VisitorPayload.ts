import { tags } from "typia";

/**
 * VisitorPayload - Authenticated visitor (unauthenticated actor) identity from
 * JWT.
 *
 * @property id Top-level visitor table ID (UUID string)
 * @property type Role discriminator: always 'visitor'
 */
export interface VisitorPayload {
  /** Top-level visitor table ID (the fundamental visitor identifier). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for the discriminated union type. */
  type: "visitor";
}
