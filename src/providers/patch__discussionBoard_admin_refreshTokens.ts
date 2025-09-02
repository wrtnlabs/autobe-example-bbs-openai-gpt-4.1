import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRefreshToken";
import { IPageIDiscussionBoardRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRefreshToken";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated, filterable list of all refresh tokens currently stored
 * in the system.
 *
 * This endpoint allows an admin to audit, search, and review refresh tokens
 * issued to users for session continuity. Supports advanced filtering: by user,
 * issued date, expiration window, device info, and revoked status. Only admins
 * may access this endpoint (props.admin is required). Results are paginated and
 * sorted, and all fields are converted to the required API types/brands.
 *
 * @param props - Call parameters
 * @param props.admin - The authenticated admin
 * @param props.body - Filtering and paging criteria
 * @returns Paginated list of refresh tokens matching the query
 * @throws {Error} If the database query fails, parameters are invalid, or user
 *   not authorized
 */
export async function patch__discussionBoard_admin_refreshTokens(props: {
  admin: AdminPayload;
  body: IDiscussionBoardRefreshToken.IRequest;
}): Promise<IPageIDiscussionBoardRefreshToken> {
  const { body } = props;
  // Pagination defaults (strict types)
  const page = Number(body.page) > 0 ? Number(body.page) : 1;
  const limit = Number(body.limit) > 0 ? Number(body.limit) : 20;

  // Allowed orderBy fields: only database scalar fields supported
  const allowedOrderFields = [
    "issued_at",
    "expires_at",
    "created_at",
    "updated_at",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.orderBy && allowedOrderFields.includes(body.orderBy)) {
    orderBy = { [body.orderBy]: "desc" };
  }

  // Build where clause dynamically (respect nullability and input semantics)
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.discussion_board_user_id !== undefined &&
      body.discussion_board_user_id !== null && {
        discussion_board_user_id: body.discussion_board_user_id,
      }),
    ...(body.device_info === null
      ? { device_info: null }
      : body.device_info !== undefined && { device_info: body.device_info }),
    ...(body.revoked_at === null
      ? { revoked_at: null }
      : body.revoked_at !== undefined &&
        body.revoked_at !== null && {
          revoked_at: body.revoked_at,
        }),
    // expires_at filter: allow gte and lte combinations
    ...(body.expires_at_gte !== undefined &&
      body.expires_at_gte !== null && {
        expires_at: { gte: body.expires_at_gte },
      }),
    ...(body.expires_at_lte !== undefined &&
      body.expires_at_lte !== null && {
        expires_at: {
          ...(body.expires_at_gte !== undefined &&
            body.expires_at_gte !== null && {
              gte: body.expires_at_gte,
            }),
          lte: body.expires_at_lte,
        },
      }),
  };

  // Fetch result and counts in parallel (no intermediate variables for single-operation params)
  const [tokens, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_refresh_tokens.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_refresh_tokens.count({ where }),
  ]);

  // Map and brand all date fields using toISOStringSafe
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: tokens.map((tk) => ({
      id: tk.id,
      discussion_board_user_id: tk.discussion_board_user_id,
      refresh_token: tk.refresh_token,
      issued_at: toISOStringSafe(tk.issued_at),
      expires_at: toISOStringSafe(tk.expires_at),
      revoked_at: tk.revoked_at == null ? null : toISOStringSafe(tk.revoked_at),
      device_info: tk.device_info ?? null,
      created_at: toISOStringSafe(tk.created_at),
      updated_at: toISOStringSafe(tk.updated_at),
      deleted_at: tk.deleted_at == null ? null : toISOStringSafe(tk.deleted_at),
    })),
  };
}
