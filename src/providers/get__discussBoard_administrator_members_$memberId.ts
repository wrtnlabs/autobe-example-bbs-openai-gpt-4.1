import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMembers";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve full details of a specific member account by ID.
 *
 * This operation fetches the precise details of a single discussion board
 * member from the database, ensuring the caller has administrator privileges.
 * The returned data includes the member's unique ID, associated user account
 * ID, public nickname, account status, and timestamps for creation, update, and
 * (if applicable) soft deletion/anonymization. Strict authorization is
 * enforced: only administrators may access this endpoint. Raises an error if
 * the specified member does not exist.
 *
 * @param props - Administrator: The authenticated administrator making the
 *   request. Must be present and of type 'administrator'. memberId: The unique
 *   UUID of the member to fetch.
 * @returns A fully populated IDiscussBoardMembers object representing the
 *   requested member, including all relevant timestamps and soft delete
 *   status.
 * @throws {Error} If the requester is not an administrator or if the requested
 *   member does not exist.
 */
export async function get__discussBoard_administrator_members_$memberId(props: {
  administrator: AdministratorPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardMembers> {
  const { administrator, memberId } = props;
  // Enforce administrator contract strictly
  if (!administrator || administrator.type !== "administrator") {
    throw new Error("Unauthorized: administrator privileges required");
  }

  const member = await MyGlobal.prisma.discuss_board_members.findUnique({
    where: { id: memberId },
  });
  if (!member) {
    throw new Error("Member not found");
  }

  return {
    id: member.id,
    user_account_id: member.user_account_id,
    nickname: member.nickname,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
  };
}
