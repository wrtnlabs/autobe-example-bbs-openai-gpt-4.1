import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMembers";
import { IPageIDiscussBoardMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardMembers";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * List and search discussion board members with filtering and pagination.
 *
 * Fetch a paginated and filterable list of discussion board members from the
 * discuss_board_members table. This operation supports administrators in
 * searching by account status, nickname, or creation date range, and returns a
 * paginated page of matching records suitable for account management,
 * moderation, or compliance audit workflows.
 *
 * The endpoint enforces administrator role authentication, ensures only active
 * (non-deleted) members are listed, and supports efficient queries even for
 * large member bases. Returned date fields are correctly formatted as RFC 3339
 * UTC strings per API/DTO specification.
 *
 * @param props - Function arguments
 * @param props.administrator - The authenticated administrator making this
 *   request
 * @param props.body - Filter and pagination criteria for searching member
 *   accounts
 * @returns Paginated and filterable list of member accounts matching the
 *   supplied search criteria
 * @throws {Error} If any database or system error occurs
 */
export async function patch__discussBoard_administrator_members(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardMembers.IRequest;
}): Promise<IPageIDiscussBoardMembers> {
  const { body } = props;
  // Default pagination with branding normalization
  const page = body.page && body.page > 0 ? Number(body.page) : 1;
  const limit = body.limit && body.limit > 0 ? Number(body.limit) : 20;

  // Build inline where clause with only schema-verified fields
  const where = {
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.nickname !== undefined &&
      body.nickname !== null && { nickname: { contains: body.nickname } }),
    ...((body.created_at_from !== undefined ||
      body.created_at_to !== undefined) && {
      created_at: {
        ...(body.created_at_from !== undefined && {
          gte: body.created_at_from,
        }),
        ...(body.created_at_to !== undefined && { lte: body.created_at_to }),
      },
    }),
  };

  // Query database for page of members and matching total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_members.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_members.count({ where }),
  ]);

  // Map results to DTO, convert Date fields to correct string formats, handle deleted_at nullable
  const data = rows.map((member) => ({
    id: member.id,
    user_account_id: member.user_account_id,
    nickname: member.nickname,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at !== undefined && member.deleted_at !== null
        ? toISOStringSafe(member.deleted_at)
        : null,
  }));
  const pages = limit === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data,
  };
}
