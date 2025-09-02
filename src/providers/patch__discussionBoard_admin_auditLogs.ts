import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve paginated audit logs for platform/system events.
 *
 * This endpoint allows administrators to search and retrieve detailed audit
 * logs of critical system activities, supporting advanced filters (actor, role,
 * action type, object, timespan, description keyword) and pagination. Results
 * are sorted by most recent first. Only users with admin role (validated by
 * AdminAuth) may perform this query.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the query
 * @param props.body - Advanced query, filter, and pagination parameters
 *   (IDiscussionBoardAuditLog.IRequest)
 * @returns Paginated audit logs matching query criteria for compliance usage
 *   (IPageIDiscussionBoardAuditLog)
 * @throws {Error} If the user is not authorized as an admin
 */
export async function patch__discussionBoard_admin_auditLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog> {
  const { admin, body } = props;

  // Pagination (default: page 1, limit 20)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build filters inline - all keys exist in schema
  const where = {
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.actor_role && { actor_role: body.actor_role }),
    ...(body.action_type && { action_type: body.action_type }),
    ...(body.target_object && { target_object: body.target_object }),
    ...((body.start_at || body.end_at) && {
      created_at: {
        ...(body.start_at && { gte: body.start_at }),
        ...(body.end_at && { lte: body.end_at }),
      },
    }),
    ...(body.keyword && {
      description: { contains: body.keyword, mode: "insensitive" as const },
    }),
  };

  // Execute queries in parallel for data and total count
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_audit_logs.count({ where }),
  ]);

  // Map to DTO: ensure date fields are string & tags.Format<'date-time'>
  const data = logs.map(
    (log): IDiscussionBoardAuditLog => ({
      id: log.id,
      actor_id: log.actor_id ?? null,
      actor_role: log.actor_role,
      action_type: log.action_type,
      target_object: log.target_object ?? null,
      description: log.description ?? null,
      created_at: toISOStringSafe(log.created_at),
    }),
  );

  // Pagination block: always use Number() to avoid tag conflicts
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
