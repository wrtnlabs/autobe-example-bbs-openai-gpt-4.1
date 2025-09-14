import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationLogs";
import { IPageIDiscussBoardModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardModerationLogs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve a paginated, filterable list of moderation logs for a specific
 * moderation action.
 *
 * This endpoint allows administrators to query the
 * discuss_board_moderation_logs table for log events attached to a specific
 * moderation action (by moderationActionId). Supports advanced filtering by
 * event type, event_details substring, and creation time window, and provides
 * paginated summaries for compliance and workflow audit purposes. Only
 * administrators with active, non-deleted, non-revoked status may access this
 * endpoint.
 *
 * @param props - The request properties
 * @param props.administrator - The authenticated administrator making the
 *   request
 * @param props.moderationActionId - The unique identifier of the moderation
 *   action being queried
 * @param props.body - The filter and pagination options for moderation logs
 * @returns Paginated, filtered summary list of moderation logs for the
 *   specified action
 * @throws {Error} If the administrator does not have permission to view the
 *   logs or DB error occurs
 */
export async function patch__discussBoard_administrator_moderationActions_$moderationActionId_moderationLogs(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: IDiscussBoardModerationLogs.IRequest;
}): Promise<IPageIDiscussBoardModerationLogs.ISummary> {
  const { administrator, moderationActionId, body } = props;

  // Pagination config
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // WHERE: only include non-deleted logs for the target action, plus optional filters
  const where = {
    deleted_at: null,
    related_action_id: moderationActionId,
    ...(body.event_type !== undefined &&
      body.event_type !== null && {
        event_type: body.event_type,
      }),
    ...(body.event_details !== undefined &&
      body.event_details !== null && {
        event_details: { contains: body.event_details },
      }),
    ...((body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && {
                gte: body.created_after,
              }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && {
                lte: body.created_before,
              }),
          },
        }
      : {}),
  };

  // Query both page of logs and record count for pagination
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_moderation_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: Number(limit),
      select: {
        id: true,
        actor_member_id: true,
        related_action_id: true,
        related_appeal_id: true,
        related_report_id: true,
        event_type: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discuss_board_moderation_logs.count({
      where,
    }),
  ]);

  // Compile paginated result as API DTO, handling all conversions.
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: logs.map((log) => ({
      id: log.id,
      actor_member_id: log.actor_member_id ?? null,
      related_action_id: log.related_action_id ?? null,
      related_appeal_id: log.related_appeal_id ?? null,
      related_report_id: log.related_report_id ?? null,
      event_type: log.event_type,
      created_at: toISOStringSafe(log.created_at),
    })),
  };
}
