import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates a password reset event for a given ID, usually to mark the token as
 * used, extend expiry, or set audit metadata per admin or system logic. Only
 * certain fields ('used_at', 'expires_at') are mutable. All others (including
 * id, reset_token, user attribution) are immutable. Soft-deleted records are
 * excluded from update. Enforces admin authorization.
 *
 * @param props - Request properties.
 * @param props.admin - The authenticated admin actor performing the update.
 * @param props.passwordResetId - Unique identifier (UUID) of the password reset
 *   entry to update.
 * @param props.body - Fields to update (used_at, expires_at).
 * @returns The full password reset record after update (with all immutable and
 *   mutable fields, dates ISO8601-branded).
 * @throws {Error} If the record does not exist, is soft-deleted, or if admin is
 *   unauthorized.
 */
export async function put__discussionBoard_admin_passwordResets_$passwordResetId(props: {
  admin: AdminPayload;
  passwordResetId: string & tags.Format<"uuid">;
  body: import("../api/structures/IDiscussionBoardPasswordReset").IDiscussionBoardPasswordReset.IUpdate;
}): Promise<
  import("../api/structures/IDiscussionBoardPasswordReset").IDiscussionBoardPasswordReset
> {
  const { admin, passwordResetId, body } = props;

  // Confirm record exists and is not soft-deleted
  const reset =
    await MyGlobal.prisma.discussion_board_password_resets.findFirstOrThrow({
      where: {
        id: passwordResetId,
        deleted_at: null,
      },
    });

  // Only update allowed fields and always update updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updateData = {
    updated_at: now,
    ...(body.used_at !== undefined ? { used_at: body.used_at } : {}),
    ...(body.expires_at !== undefined ? { expires_at: body.expires_at } : {}),
  };

  const updated = await MyGlobal.prisma.discussion_board_password_resets.update(
    {
      where: { id: passwordResetId },
      data: updateData,
    },
  );

  // Return all properties, converting Date fields to string, handling nullables
  return {
    id: updated.id,
    discussion_board_user_id: updated.discussion_board_user_id,
    reset_token: updated.reset_token,
    expires_at: toISOStringSafe(updated.expires_at),
    used_at: updated.used_at ? toISOStringSafe(updated.used_at) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
