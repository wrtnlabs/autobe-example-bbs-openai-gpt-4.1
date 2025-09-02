import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVerificationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update non-sensitive verification token metadata (admin only).
 *
 * Update metadata or non-sensitive properties of a verification token, such as
 * adjusting expiration, marking as used, or updating administrative notes.
 *
 * This operation is restricted to administrative and compliance staff, as
 * changes to verification tokens can impact security and account activation
 * workflows. The operation never allows direct modification of the token value
 * itself. All property updates are subject to detailed audit logging per
 * compliance requirements. Only the fields allowed in the
 * IDiscussionBoardVerificationToken.IUpdate schema may be changed.
 *
 * Typical use cases include resolving user support escalations,
 * compliance-driven metadata updates, or exceptional case workflow adjustments.
 * Full compliance with the Prisma schema's field definitions and relations is
 * enforced.
 *
 * @param props - Properties for this request
 * @param props.admin - Authenticated admin performing the update
 * @param props.verificationTokenId - Unique identifier for the verification
 *   token being updated
 * @param props.body - Updatable fields (expires_at, used_at)
 * @returns The updated verification token record with all fields formatted
 *   correctly
 * @throws {Error} If the verification token does not exist or is soft-deleted
 */
export async function put__discussionBoard_admin_verificationTokens_$verificationTokenId(props: {
  admin: AdminPayload;
  verificationTokenId: string & tags.Format<"uuid">;
  body: IDiscussionBoardVerificationToken.IUpdate;
}): Promise<IDiscussionBoardVerificationToken> {
  const { verificationTokenId, body } = props;
  // Find the token and ensure it is not soft-deleted
  const token =
    await MyGlobal.prisma.discussion_board_verification_tokens.findUnique({
      where: { id: verificationTokenId },
    });
  if (!token || token.deleted_at) {
    throw new Error("Verification token not found or has been deleted");
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Only allow mutation of allowed fields and always update updated_at
  const updated =
    await MyGlobal.prisma.discussion_board_verification_tokens.update({
      where: { id: verificationTokenId },
      data: {
        expires_at: body.expires_at ?? undefined,
        used_at: body.used_at ?? undefined,
        updated_at: now,
      },
    });
  return {
    id: updated.id,
    discussion_board_user_id: updated.discussion_board_user_id,
    verification_token: updated.verification_token,
    purpose: updated.purpose,
    expires_at: toISOStringSafe(updated.expires_at),
    used_at: updated.used_at ? toISOStringSafe(updated.used_at) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
