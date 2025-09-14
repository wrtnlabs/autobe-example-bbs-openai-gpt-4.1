import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMembers";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Create a new member by administrator action.
 *
 * This operation allows administrator users to manually create a new discussion
 * board member by providing all required account and membership information. It
 * operates on the discuss_board_members table and its foreign key associations.
 * Only administrator role may access this endpoint.
 *
 * The member is created with supplied user_account_id, unique nickname, and
 * account status. Uniqueness of user_account_id and nickname is enforced at
 * database layer. On conflict, an error is thrown.
 *
 * @param props - Request properties
 * @param props.administrator - Authenticated administrator user (injected by
 *   decorator)
 * @param props.body - Member creation data, including user_account_id,
 *   nickname, status
 * @returns The created member record
 * @throws {Error} When nickname or user_account_id is not unique
 * @throws {Error} For other Prisma/database errors
 */
export async function post__discussBoard_administrator_members(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardMembers.ICreate;
}): Promise<IDiscussBoardMembers> {
  const { body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;
  try {
    const created = await MyGlobal.prisma.discuss_board_members.create({
      data: {
        id,
        user_account_id: body.user_account_id,
        nickname: body.nickname,
        status: body.status,
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        user_account_id: true,
        nickname: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return {
      id: created.id,
      user_account_id: created.user_account_id,
      nickname: created.nickname,
      status: created.status,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== null && created.deleted_at !== undefined
          ? toISOStringSafe(created.deleted_at)
          : null,
    };
  } catch (exp) {
    if (
      exp instanceof Prisma.PrismaClientKnownRequestError &&
      exp.code === "P2002"
    ) {
      throw new Error("Duplicate nickname or user_account_id.");
    }
    throw exp;
  }
}
