import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMembers";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update details of an existing member by administrator action.
 *
 * This operation allows administrator users to update attributes of an existing
 * member in discuss_board_members. Fields that may be updated include nickname,
 * status, and deleted_at (for soft-delete). It enforces all business
 * validation, including status changes, nickname uniqueness (unique throughout
 * the table), and system integrity. Only administrators may perform this
 * operation; the administrator payload must be present in props.
 *
 * On success, returns the full updated member record. Throws if member is not
 * found, already deleted, or if the nickname is already in use by another
 * member.
 *
 * @param props - Operation properties
 * @param props.administrator - Authenticated administrator payload authorizing
 *   the operation
 * @param props.memberId - UUID of the member to update
 * @param props.body - Fields to update (nickname, status, deleted_at)
 * @returns The updated member record with all fields in canonical format
 * @throws {Error} If member not found, already deleted, or nickname not unique
 */
export async function put__discussBoard_administrator_members_$memberId(props: {
  administrator: AdministratorPayload;
  memberId: string & tags.Format<"uuid">;
  body: IDiscussBoardMembers.IUpdate;
}): Promise<IDiscussBoardMembers> {
  const { administrator, memberId, body } = props;

  // Find the member (must exist and not be deleted)
  const member = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      id: memberId,
      deleted_at: null,
    },
  });
  if (!member) {
    throw new Error("Member not found or already deleted");
  }

  // If nickname is to be changed, enforce uniqueness
  if (body.nickname !== undefined) {
    const duplicate = await MyGlobal.prisma.discuss_board_members.findFirst({
      where: {
        nickname: body.nickname,
        id: { not: memberId },
        deleted_at: null,
      },
    });
    if (duplicate) {
      throw new Error("Nickname already in use");
    }
  }

  // Always update timestamps in ISO 8601 string with tags.Format<'date-time'>
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discuss_board_members.update({
    where: { id: memberId },
    data: {
      nickname: body.nickname ?? undefined,
      status: body.status ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    user_account_id: updated.user_account_id,
    nickname: updated.nickname,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
