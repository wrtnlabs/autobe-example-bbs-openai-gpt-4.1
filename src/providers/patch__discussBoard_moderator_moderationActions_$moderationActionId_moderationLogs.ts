import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationLogs";
import { IPageIDiscussBoardModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardModerationLogs";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieve a paginated, filterable list of moderation logs for a specific
 * moderation action.
 *
 * Given a moderation action identifier (moderationActionId), this function
 * returns a paginated, filterable list of moderation logs attached to that
 * moderation action, with support for filtering by event type, event details
 * (full-text), creation timestamp range, and fully customizable pagination.
 *
 * Authorization: Only accessible to authenticated moderators (enforced via
 * ModeratorAuth decorator).
 *
 * @param props - Request parameter object.
 * @param props.moderator - The authenticated moderator.
 * @param props.moderationActionId - The unique identifier of the moderation
 *   action whose logs are being queried.
 * @param props.body - Filtering and pagination parameters (event_type,
 *   event_details, created_after, created_before, page, limit).
 * @returns Paginated filtered summary list of moderation logs for the specified
 *   action.
 * @throws {Error} If database query fails or unexpected issues encountered.
 */
export async function patch__discussBoard_moderator_moderationActions_$moderationActionId_moderationLogs(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: IDiscussBoardModerationLogs.IRequest;
}): Promise<IPageIDiscussBoardModerationLogs.ISummary> {
  const { moderationActionId, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Compose where conditions for both findMany and count
  const buildWhere = () => ({
    related_action_id: moderationActionId,
    ...(body.event_type !== undefined && { event_type: body.event_type }),
    ...(body.event_details !== undefined &&
      body.event_details !== "" && {
        event_details: { contains: body.event_details },
      }),
    // created_at: with optional gte/lte logic
    ...(body.created_after !== undefined || body.created_before !== undefined
      ? {
          created_at: {
            ...(body.created_after !== undefined && {
              gte: body.created_after,
            }),
            ...(body.created_before !== undefined && {
              lte: body.created_before,
            }),
          },
        }
      : {}),
    deleted_at: null,
  });

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_moderation_logs.findMany({
      where: buildWhere(),
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_moderation_logs.count({
      where: buildWhere(),
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      actor_member_id: row.actor_member_id ?? null,
      related_action_id: row.related_action_id ?? null,
      related_appeal_id: row.related_appeal_id ?? null,
      related_report_id: row.related_report_id ?? null,
      event_type: row.event_type,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
