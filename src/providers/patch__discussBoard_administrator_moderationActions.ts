import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationAction";
import { IPageIDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardModerationAction";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve a paginated, filterable list of moderation actions (administrator
 * only).
 *
 * Enables administrators to review, audit, and analyze all moderation actions
 * taken across the discussBoard platform. This includes advanced filters by
 * moderator, target, content, action type, status, and date. Only authenticated
 * administrators may access this operation. All fields and mappings strictly
 * follow the database and API type definitions, ensuring date values are always
 * ISO-8601 strings, with no use of the native Date object.
 *
 * @param props - The request parameter object.
 * @param props.administrator - The authenticated administrator making the
 *   request.
 * @param props.body - Filter, search, and pagination criteria for action
 *   retrieval.
 * @returns Paginated list of moderation actions matching the requested filters
 *   and sort order.
 * @throws {Error} When no administrator or invalid filters are supplied.
 */
export async function patch__discussBoard_administrator_moderationActions(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardModerationAction.IRequest;
}): Promise<IPageIDiscussBoardModerationAction.ISummary> {
  const { body } = props;
  // Pagination parameters and normalization
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;
  // Filtering - dynamically construct where clause
  const where = {
    deleted_at: null,
    ...(body.moderator_id !== undefined &&
      body.moderator_id !== null && {
        moderator_id: body.moderator_id,
      }),
    ...(body.target_member_id !== undefined && {
      target_member_id: body.target_member_id,
    }),
    ...(body.target_post_id !== undefined && {
      target_post_id: body.target_post_id,
    }),
    ...(body.target_comment_id !== undefined && {
      target_comment_id: body.target_comment_id,
    }),
    ...(body.action_type !== undefined && { action_type: body.action_type }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
  };
  // Sorting - always define orderBy inline
  const orderBy = body.sort
    ? (() => {
        const [field, direction] = body.sort.split(":");
        if (["created_at", "status", "action_type"].includes(field)) {
          return {
            [field]: direction === "asc" ? "asc" : "desc",
          } as Record<string, "asc" | "desc">;
        }
        return { created_at: "desc" as const };
      })()
    : { created_at: "desc" as const };

  // Data + count for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_moderation_actions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_moderation_actions.count({ where }),
  ]);
  // Map rows to ISummary using strict typing and ISO-format for dates
  const data = rows.map(
    (row): IDiscussBoardModerationAction.ISummary => ({
      id: row.id,
      moderator_id: row.moderator_id,
      target_member_id: row.target_member_id ?? null,
      target_post_id: row.target_post_id ?? null,
      target_comment_id: row.target_comment_id ?? null,
      action_type: row.action_type,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
    }),
  );
  // Pagination block
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
