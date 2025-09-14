import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardNotifications";
import { IPageIDiscussBoardNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardNotifications";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Search and retrieve a paginated, filterable list of notification delivery log
 * entries (discuss_board_notifications).
 *
 * This endpoint allows authorized administrators to search notification event
 * logs for compliance, analytics, audit, or troubleshooting. Supports filter
 * criteria: recipient (user_account_id), event_type, delivery_channel,
 * delivery_status, created_at_from/to, pagination, and sorting on 'created_at'.
 * Only non-deleted records (deleted_at: null) are considered. Results are
 * paginated with DTO-compliant metadata. Dates are always formatted as string &
 * tags.Format<'date-time'>; never use native Date type.
 *
 * @param props - Object containing all necessary parameters for this operation
 * @param props.administrator - The authenticated administrator making the
 *   request
 * @param props.body - The request body including search filters and pagination
 * @returns Paginated results of notification event log summaries for
 *   compliance, audit, or analytics
 * @throws {Error} When any unexpected internal error occurs
 */
export async function patch__discussBoard_administrator_notifications(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardNotifications.IRequest;
}): Promise<IPageIDiscussBoardNotifications.ISummary> {
  const { body } = props;

  // Pagination: 1-based input, but IPage.IPagination.current is 0-based
  const requestedPage = body.page !== undefined ? body.page : 1;
  const rawLimit = body.limit !== undefined ? body.limit : 20;
  const limit = Math.max(1, Math.min(1000, Number(rawLimit)));
  const page = Math.max(1, Number(requestedPage)); // always >= 1
  const skip = (page - 1) * limit;

  // Handle sorting (only 'created_at' allowed, fallback to 'created_at')
  const allowedSortFields = ["created_at"];
  const orderByField = allowedSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by ?? "created_at")
    : "created_at";
  const orderByDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // Build where clause (deleted_at: null for soft delete semantics)
  const where = {
    deleted_at: null,
    ...(body.user_account_id !== undefined &&
      body.user_account_id !== null && {
        user_account_id: body.user_account_id,
      }),
    ...(body.event_type !== undefined &&
      body.event_type !== null && {
        event_type: body.event_type,
      }),
    ...(body.delivery_channel !== undefined &&
      body.delivery_channel !== null && {
        delivery_channel: body.delivery_channel,
      }),
    ...(body.delivery_status !== undefined &&
      body.delivery_status !== null && {
        delivery_status: body.delivery_status,
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
  };

  // Query results and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_notifications.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limit,
      select: {
        id: true,
        user_account_id: true,
        event_type: true,
        delivery_channel: true,
        subject: true,
        delivery_status: true,
        delivered_at: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discuss_board_notifications.count({ where }),
  ]);

  // Map to IDiscussBoardNotifications.ISummary
  const data = rows.map((row) => ({
    id: row.id,
    user_account_id: row.user_account_id,
    event_type: row.event_type,
    delivery_channel: row.delivery_channel,
    subject: row.subject,
    delivery_status: row.delivery_status,
    delivered_at:
      row.delivered_at !== null && row.delivered_at !== undefined
        ? toISOStringSafe(row.delivered_at)
        : null,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Pagination metadata: IPage.IPagination requires 0-based page numbering
  return {
    pagination: {
      current: Number(page) - 1,
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
