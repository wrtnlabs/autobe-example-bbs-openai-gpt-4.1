import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardConsentRecords } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardConsentRecords";
import { IPageIDiscussBoardConsentRecords } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardConsentRecords";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve a paginated and filterable list of user consent records.
 *
 * This operation allows administrators to search, filter, and paginate through
 * the discuss_board_consent_records table. Filters include user_account_id,
 * policy_type, policy_version, consent_action, creation date range, and a
 * free-text search on the description. Only users with administrator privileges
 * may access this endpoint.
 *
 * @param props - The request object containing administrator authorization and
 *   filter parameters
 * @param props.administrator - The authenticated administrator's payload
 * @param props.body - Filtering and pagination options
 * @returns Paginated result containing matching consent records
 * @throws {Error} If the administrator is not present or not properly
 *   authorized
 */
export async function patch__discussBoard_administrator_consentRecords(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardConsentRecords.IRequest;
}): Promise<IPageIDiscussBoardConsentRecords> {
  const { administrator, body } = props;

  if (!administrator || administrator.type !== "administrator") {
    throw new Error(
      "Unauthorized: Only administrators can access this endpoint.",
    );
  }

  // Default pagination values (1-based)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Hard-coded allowlist for ordering
  const allowedOrderFields = [
    "created_at",
    "user_account_id",
    "policy_type",
    "policy_version",
    "consent_action",
  ];
  const orderByField =
    body.orderBy && allowedOrderFields.includes(body.orderBy)
      ? body.orderBy
      : "created_at";
  const sortDirection = body.sortDirection === "asc" ? "asc" : "desc";

  // Query construction: Only include filters if defined and (if string, not empty)
  const where = {
    ...(body.user_account_id !== undefined &&
      body.user_account_id !== null && {
        user_account_id: body.user_account_id,
      }),
    ...(body.policy_type !== undefined &&
      body.policy_type !== null &&
      body.policy_type.length > 0 && {
        policy_type: body.policy_type,
      }),
    ...(body.policy_version !== undefined &&
      body.policy_version !== null &&
      body.policy_version.length > 0 && {
        policy_version: body.policy_version,
      }),
    ...(body.consent_action !== undefined &&
      body.consent_action !== null &&
      body.consent_action.length > 0 && {
        consent_action: body.consent_action,
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
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        description: {
          contains: body.search,
        },
      }),
  };

  // Fetch result and total count in parallel (never extract orderBy as variable)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_consent_records.findMany({
      where,
      orderBy: { [orderByField]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_consent_records.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map(
      (row): IDiscussBoardConsentRecords => ({
        id: row.id,
        user_account_id: row.user_account_id,
        policy_type: row.policy_type,
        policy_version: row.policy_version,
        consent_action: row.consent_action,
        description: row.description ?? null,
        created_at: toISOStringSafe(row.created_at),
      }),
    ),
  };
}
