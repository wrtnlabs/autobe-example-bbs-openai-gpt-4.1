import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a verification token by ID (admin only, audit retained).
 *
 * Marks a verification token as deleted by setting its `deleted_at` field to
 * the current time, preserving the record for audit compliance but rendering it
 * unusable for authentication workflows. Admin authorization is required to
 * execute this operation.
 *
 * This function is idempotent: If the token doesn't exist or is already
 * soft-deleted, it completes silently.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the deletion
 *   (authorization is mandatory)
 * @param props.verificationTokenId - Unique identifier for the target
 *   verification token (UUID)
 * @returns Void
 * @throws {Error} If an unexpected internal error occurs during the operation
 */
export async function delete__discussionBoard_admin_verificationTokens_$verificationTokenId(props: {
  admin: AdminPayload;
  verificationTokenId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, verificationTokenId } = props;
  // Set the soft delete timestamp to now; idempotent for repeated calls.
  await MyGlobal.prisma.discussion_board_verification_tokens.updateMany({
    where: {
      id: verificationTokenId,
      deleted_at: null,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
