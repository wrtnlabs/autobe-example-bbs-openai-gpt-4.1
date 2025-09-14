import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardIntegrationLog";
import { IPageIDiscussBoardIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardIntegrationLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Search and page through external integration events
 * (discuss_board_integration_logs).
 *
 * Allows administrators to retrieve a filtered, paginated list of integration
 * log events documenting communication between the discussBoard platform and
 * partner services. Supports search by integration type, external partner,
 * event trigger, status, user account, and date window. Results are sorted and
 * paginated with full audit detail, including payloads, timing, errors, and
 * reference IDs. Restricted to administrators only. Soft-deleted logs are
 * excluded. All date values are strict ISO 8601 strings. Pagination meta uses
 * IPage.IPagination conventions with correct tags.
 *
 * @param props - Request object
 * @param props.administrator - Authenticated administrator payload
 * @param props.body - Search and filter criteria for integration logs
 *   (IDiscussBoardIntegrationLog.IRequest)
 * @returns Paginated page of integration log records matching criteria
 *   (IPageIDiscussBoardIntegrationLog)
 * @throws {Error} If rare database errors occur or if business contract is
 *   violated
 */
export async function patch__discussBoard_administrator_integrationLogs(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardIntegrationLog.IRequest;
}): Promise<IPageIDiscussBoardIntegrationLog> {
  const { body } = props;
  // --- Pagination & limit enforcement ---
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  let limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  if (limit > 1000) limit = 1000;
  // --- Sorting ---
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "integration_type",
    "integration_partner",
    "integration_status",
    "triggered_event",
  ];
  const sort_by = allowedSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by ?? "created_at")
    : "created_at";
  const sort_direction = body.sort_direction === "asc" ? "asc" : "desc";
  // --- Build where condition ---
  const where = {
    deleted_at: null,
    ...(body.user_account_id !== undefined &&
      body.user_account_id !== null && {
        user_account_id: body.user_account_id,
      }),
    ...(body.integration_type !== undefined &&
      body.integration_type !== null && {
        integration_type: body.integration_type,
      }),
    ...(body.integration_partner !== undefined &&
      body.integration_partner !== null && {
        integration_partner: body.integration_partner,
      }),
    ...(body.integration_status !== undefined &&
      body.integration_status !== null && {
        integration_status: body.integration_status,
      }),
    ...(body.triggered_event !== undefined &&
      body.triggered_event !== null && {
        triggered_event: body.triggered_event,
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
  // --- Query database in parallel ---
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_integration_logs.findMany({
      where,
      orderBy: { [sort_by]: sort_direction },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_integration_logs.count({ where }),
  ]);
  // --- Build results ---
  const data = rows.map((row) => {
    return {
      id: row.id,
      user_account_id: row.user_account_id ?? undefined,
      integration_type: row.integration_type,
      integration_partner: row.integration_partner,
      payload: row.payload,
      integration_status: row.integration_status,
      external_reference_id: row.external_reference_id ?? undefined,
      triggered_event: row.triggered_event,
      error_message: row.error_message ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    };
  });
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(limit) > 0 ? Math.ceil(Number(total) / Number(limit)) : 0,
    },
    data,
  };
}
