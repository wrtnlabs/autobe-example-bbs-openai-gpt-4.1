import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Fetches full metadata and status for a single password reset entry by its
 * unique ID.
 *
 * Only admins may access this endpoint. Fetches full password reset metadata
 * including internal fields and status. Throws an error if the record does not
 * exist or is deleted.
 *
 * @param props - Request properties
 * @param props.admin - Admin authentication payload (must be a valid, active
 *   admin)
 * @param props.passwordResetId - The UUID of the password reset record to
 *   retrieve
 * @returns Password reset record details including owner, usage/expiry audit,
 *   and (for admin) the raw reset token string
 * @throws {Error} When the entry is not found, is soft-deleted, or the caller
 *   is not an admin
 */
export async function get__discussionBoard_admin_passwordResets_$passwordResetId(props: {
  admin: AdminPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardPasswordReset> {
  const { passwordResetId } = props;

  const reset =
    await MyGlobal.prisma.discussion_board_password_resets.findFirst({
      where: {
        id: passwordResetId,
        deleted_at: null,
      },
    });
  if (!reset) {
    throw new Error("Password reset record not found");
  }

  return {
    id: reset.id,
    discussion_board_user_id: reset.discussion_board_user_id,
    reset_token: reset.reset_token,
    expires_at: toISOStringSafe(reset.expires_at),
    used_at: reset.used_at ? toISOStringSafe(reset.used_at) : null,
    created_at: toISOStringSafe(reset.created_at),
    updated_at: toISOStringSafe(reset.updated_at),
    deleted_at: reset.deleted_at ? toISOStringSafe(reset.deleted_at) : null,
  };
}
