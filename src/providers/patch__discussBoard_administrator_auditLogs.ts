import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardGlobalAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardGlobalAuditLog";
import { IPageIDiscussBoardGlobalAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardGlobalAuditLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Search and paginate global audit logs (discuss_board_global_audit_logs).
 *
 * Enables administrators to filter, sort, and page through audit log records by
 * actor, event category, target entity, date range, and full-text criteria.
 * Only administrators can access this endpoint due to the sensitive nature of
 * audit logs.
 *
 * @param props - Audit log search request with administrator payload and filter
 *   criteria
 * @param props.administrator - Authenticated administrator making the request
 * @param props.body - Filter, pagination, and search criteria for querying
 *   audit logs
 * @returns Paginated results containing matching audit log entries and
 *   pagination info
 * @throws {Error} When any database or permission error occurs
 */
export async function patch__discussBoard_administrator_auditLogs(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardGlobalAuditLog.IRequest;
}): Promise<IPageIDiscussBoardGlobalAuditLog> {
  const { administrator, body } = props;

  // Pagination values with strict defaults
  const limit =
    body.limit !== undefined && body.limit !== null ? Number(body.limit) : 20;
  const page =
    body.page !== undefined && body.page !== null ? Number(body.page) : 1;
  const skip = (page - 1) * limit;

  // Compose the Prisma where clause with strict type guards
  const where: Record<string, unknown> = {
    ...(body.actor_type !== undefined && { actor_type: body.actor_type }),
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && {
        actor_id: body.actor_id,
      }),
    ...(body.action_category !== undefined && {
      action_category: body.action_category,
    }),
    ...(body.target_table !== undefined && {
      target_table: body.target_table,
    }),
    ...(body.target_id !== undefined &&
      body.target_id !== null && {
        target_id: body.target_id,
      }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
    ...(body.event_description_search !== undefined &&
      body.event_description_search !== null && {
        event_description: { contains: body.event_description_search },
      }),
  };

  // Determine sort order, using only valid fields; use as const for sort order
  const orderBy = !body.sort
    ? { created_at: "desc" as const }
    : (() => {
        const [field, orderDir] = body.sort.split(" ");
        const validFields = [
          "created_at",
          "actor_type",
          "action_category",
          "target_table",
          "event_description",
        ];
        if (!validFields.includes(field))
          return { created_at: "desc" as const };
        if (orderDir === "asc" || orderDir === "desc")
          return { [field]: orderDir as "asc" | "desc" };
        return { created_at: "desc" as const };
      })();

  // Query the database for results and the total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_global_audit_logs.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_global_audit_logs.count({ where }),
  ]);

  // Map database rows to DTO, converting all datetimes using toISOStringSafe
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      actor_id: row.actor_id ?? undefined,
      actor_type: row.actor_type,
      action_category: row.action_category,
      target_table: row.target_table,
      target_id: row.target_id ?? undefined,
      event_payload: row.event_payload ?? undefined,
      event_description: row.event_description,
      created_at: toISOStringSafe(row.created_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    })),
  };
}
