import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Search and retrieve a filtered, paginated list of appeals.
 *
 * Retrieves all appeals against moderation actions or flag reports matching
 * filters for appellant, moderation_action, flag_report, status, and creation
 * date. Supports pagination, capped page size, and sorts for efficient
 * moderator workflow. Enforces soft-delete and returns paginated,
 * API-compatible results. Only accessible to moderators (authorization enforced
 * by ModeratorPayload presence).
 *
 * @param props - Props containing moderator auth and search body
 * @param props.moderator - ModeratorPayload (authentication enforced)
 * @param props.body - IRequest: Filtering and pagination controls for appeals
 *   list
 * @returns Paginated list of IDiscussionBoardAppeal per
 *   IPageIDiscussionBoardAppeal
 * @throws {Error} When requested page size exceeds allowed limit
 */
export async function patch__discussionBoard_moderator_appeals(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardAppeal.IRequest;
}): Promise<IPageIDiscussionBoardAppeal> {
  const { moderator, body } = props;
  // --- Pagination controls, defaults, safety cap ---
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  if (limit > 100) throw new Error("Limit cannot exceed 100");

  // --- Build Prisma filters, only including actual fields ---
  const filters = {
    deleted_at: null,
    ...(body.appellant_id !== undefined &&
      body.appellant_id !== null && { appellant_id: body.appellant_id }),
    ...(body.moderation_action_id !== undefined &&
      body.moderation_action_id !== null && {
        moderation_action_id: body.moderation_action_id,
      }),
    ...(body.flag_report_id !== undefined &&
      body.flag_report_id !== null && { flag_report_id: body.flag_report_id }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // --- Run concurrent queries for paging ---
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_appeals.findMany({
      where: filters,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_appeals.count({ where: filters }),
  ]);

  // --- Transform to API type, ensuring all Date fields → ISO strings ---
  const data = rows.map((appeal) => ({
    id: appeal.id,
    appellant_id: appeal.appellant_id,
    moderation_action_id: appeal.moderation_action_id ?? null,
    flag_report_id: appeal.flag_report_id ?? null,
    appeal_reason: appeal.appeal_reason,
    status: appeal.status,
    resolution_comment: appeal.resolution_comment ?? null,
    resolved_at: appeal.resolved_at
      ? toISOStringSafe(appeal.resolved_at)
      : null,
    created_at: toISOStringSafe(appeal.created_at),
    updated_at: toISOStringSafe(appeal.updated_at),
    deleted_at: appeal.deleted_at ? toISOStringSafe(appeal.deleted_at) : null,
  }));

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
