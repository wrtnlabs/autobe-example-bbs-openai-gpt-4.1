import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieve detailed profile and account metadata for a specific user (by
 * userId), restricted to moderator access.
 *
 * This function fetches a user's account details from the
 * discussion_board_users table, exposing all fields per compliance and audit,
 * while omitting sensitive and write-only values (such as password hashes).
 * Access is strictly limited to authenticated moderators as enforced by the
 * controller.
 *
 * @param props - Properties required for user lookup and authorization.
 * @param props.moderator - ModeratorPayload; injected by ModeratorAuth
 *   decorator to guarantee caller role.
 * @param props.userId - UUID of the user to retrieve; must be a valid
 *   discussion_board_users.id.
 * @returns IDiscussionBoardUser - All compliance/audit-related fields for the
 *   specified user; never includes confidential fields.
 * @throws {Error} If the user does not exist or has been soft-deleted
 *   (deleted_at present).
 */
export async function get__discussionBoard_moderator_users_$userId(props: {
  moderator: ModeratorPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUser> {
  const { userId } = props;
  const record = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
  });
  if (!record) throw new Error("User not found");
  return {
    id: record.id,
    email: record.email,
    username: record.username,
    display_name: record.display_name ?? null,
    is_verified: record.is_verified,
    is_suspended: record.is_suspended,
    suspended_until:
      record.suspended_until === null || record.suspended_until === undefined
        ? null
        : toISOStringSafe(record.suspended_until),
    last_login_at:
      record.last_login_at === null || record.last_login_at === undefined
        ? null
        : toISOStringSafe(record.last_login_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null || record.deleted_at === undefined
        ? null
        : toISOStringSafe(record.deleted_at),
  };
}
