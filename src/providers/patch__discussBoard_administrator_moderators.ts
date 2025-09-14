import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerator";
import { IPageIDiscussBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardModerator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve a filtered, paginated list of registered moderators
 * (discuss_board_moderators table).
 *
 * Provides a paginated, filterable summary view of all moderator accounts on
 * the platform, supporting search by status, assignment date range, or
 * member_nickname, for administrative usage. Requires administrator
 * authentication for access.
 *
 * @param props - The request properties
 * @param props.administrator - The authenticated administrator making the
 *   request
 * @param props.body - The filter and paging parameters
 *   (IDiscussBoardModerator.IRequest)
 * @returns Paginated summary list (IPageIDiscussBoardModerator.ISummary)
 * @throws {Error} If database access fails or input is invalid
 */
export async function patch__discussBoard_administrator_moderators(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardModerator.IRequest;
}): Promise<IPageIDiscussBoardModerator.ISummary> {
  const { body } = props;
  // Pagination defaults
  const page = body.page && body.page >= 1 ? body.page : 1;
  const limit = body.limit && body.limit >= 1 ? body.limit : 20;

  // Filters (nullable/date/joins) - inline object pattern for type inference
  const where = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    // handle assigned_at window (gte/lte)
    ...((body.assigned_from !== undefined && body.assigned_from !== null) ||
    (body.assigned_to !== undefined && body.assigned_to !== null)
      ? {
          assigned_at: {
            ...(body.assigned_from !== undefined &&
              body.assigned_from !== null && {
                gte: body.assigned_from,
              }),
            ...(body.assigned_to !== undefined &&
              body.assigned_to !== null && {
                lte: body.assigned_to,
              }),
          },
        }
      : {}),
    member: {
      deleted_at: null,
      status: "active",
      ...(body.member_nickname !== undefined &&
        body.member_nickname !== null && {
          nickname: body.member_nickname,
        }),
    },
  };

  // Sort
  const sortBy =
    body.sort_by && typeof body.sort_by === "string" && body.sort_by.length > 0
      ? body.sort_by
      : "assigned_at";
  const sortDir = body.sort_direction === "asc" ? "asc" : "desc";

  // Query moderators and count for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_moderators.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.discuss_board_moderators.count({ where }),
  ]);

  // Map rows to ISummary, convert all Date fields
  const data = rows.map((row) => ({
    id: row.id,
    member_id: row.member_id,
    status: row.status,
    assigned_at: toISOStringSafe(row.assigned_at),
    revoked_at: row.revoked_at ? toISOStringSafe(row.revoked_at) : null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // Pagination struct (IPage.IPagination)
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / Number(limit)),
  };

  return { pagination, data };
}
