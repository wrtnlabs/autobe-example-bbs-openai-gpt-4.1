import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";
import { IPageIDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Search and paginate administrator accounts in discuss_board_administrators.
 *
 * Retrieves a paginated, filterable list of administrator accounts from the
 * discuss_board_administrators table. Supports filtering by status, escalation
 * or creation date ranges, and allows sorting by key fields. Only authenticated
 * administrators may perform this operation. Returns summary metadata for each
 * admin, suitable for dashboard or audit grip.
 *
 * @param props - The input object containing:
 *
 *   - Administrator: The authenticated administrator JWT payload (for access
 *       control)
 *   - Body: Search, filter, and pagination parameters
 *       (IDiscussBoardAdministrator.IRequest)
 *
 * @returns An object containing pagination metadata and an array of
 *   administrator summaries matching the requested criteria.
 * @throws {Error} If database operations fail or unauthorized access occurs
 */
export async function patch__discussBoard_administrator_administrators(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardAdministrator.IRequest;
}): Promise<IPageIDiscussBoardAdministrator.ISummary> {
  const { administrator, body } = props;

  // Authorization already enforced by decorator; business logic can assume validity

  // Pagination
  const page =
    body.page !== undefined && body.page !== null && body.page > 0
      ? body.page
      : 1;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit > 0
      ? body.limit
      : 20;

  // Filtering
  // Only filter on allowed schema fields
  const where = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    // Escalation date range
    ...((body.escalation_date_from !== undefined &&
      body.escalation_date_from !== null) ||
    (body.escalation_date_to !== undefined && body.escalation_date_to !== null)
      ? {
          escalated_at: {
            ...(body.escalation_date_from !== undefined &&
              body.escalation_date_from !== null && {
                gte: body.escalation_date_from,
              }),
            ...(body.escalation_date_to !== undefined &&
              body.escalation_date_to !== null && {
                lte: body.escalation_date_to,
              }),
          },
        }
      : {}),
    // Created date range
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
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
  };

  // Sorting
  const allowedSortFields = [
    "escalated_at",
    "status",
    "created_at",
    "updated_at",
  ];
  const sort_by =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "escalated_at";
  const sort_direction = body.sort_direction === "asc" ? "asc" : "desc";

  // Data/page
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_administrators.findMany({
      where,
      orderBy: { [sort_by]: sort_direction },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_administrators.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((adm) => ({
      id: adm.id,
      member_id: adm.member_id,
      status: adm.status,
      escalated_at: toISOStringSafe(adm.escalated_at),
      revoked_at: adm.revoked_at ? toISOStringSafe(adm.revoked_at) : null,
      created_at: toISOStringSafe(adm.created_at),
      updated_at: toISOStringSafe(adm.updated_at),
    })),
  };
}
