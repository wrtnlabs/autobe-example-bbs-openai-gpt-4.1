import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";
import { IPageIDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a filtered and paginated list of all password reset records for
 * discussion board admins.
 *
 * Allows admins to audit, review, and analyze password reset flows for
 * compliance and security. Supports filtering by user, used/pending status,
 * expiration window, and pagination. Only accessible by admin users; sensitive
 * reset tokens are masked in output. Errors are thrown for invalid input or
 * data access problems.
 *
 * @param props - Request containing:
 *
 *   - Admin: the authenticated admin's payload
 *   - Body: IDiscussionBoardPasswordReset.IRequest containing filter, pagination,
 *       and sorting instructions
 *
 * @returns Paginated password reset records matching filters, with all
 *   sensitive reset_token values masked
 * @throws {Error} If access is denied or internal errors occur
 */
export async function patch__discussionBoard_admin_passwordResets(props: {
  admin: AdminPayload;
  body: IDiscussionBoardPasswordReset.IRequest;
}): Promise<IPageIDiscussionBoardPasswordReset> {
  const { admin, body } = props;

  // Pagination
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 20;
  const offset = (page - 1) * limit;

  // Compose expires_at gte/lte filter if present
  const expiresAtFilter =
    (body.expires_at_gte !== undefined && body.expires_at_gte !== null) ||
    (body.expires_at_lte !== undefined && body.expires_at_lte !== null)
      ? {
          ...(body.expires_at_gte !== undefined &&
            body.expires_at_gte !== null && { gte: body.expires_at_gte }),
          ...(body.expires_at_lte !== undefined &&
            body.expires_at_lte !== null && { lte: body.expires_at_lte }),
        }
      : undefined;

  // Where filter
  const where = {
    deleted_at: null,
    ...(body.discussion_board_user_id !== undefined &&
      body.discussion_board_user_id !== null && {
        discussion_board_user_id: body.discussion_board_user_id,
      }),
    ...(body.used_at !== undefined
      ? body.used_at === null
        ? { used_at: null }
        : { used_at: body.used_at }
      : {}),
    ...(expiresAtFilter && { expires_at: expiresAtFilter }),
  };

  // Validate orderBy against safe set of columns
  const allowedOrderFields = [
    "id",
    "discussion_board_user_id",
    "expires_at",
    "used_at",
    "created_at",
    "updated_at",
  ];
  const orderByField =
    typeof body.orderBy === "string" &&
    allowedOrderFields.includes(body.orderBy)
      ? body.orderBy
      : "created_at";

  // Fetch filtered rows and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_password_resets.findMany({
      where,
      orderBy: { [orderByField]: "desc" },
      skip: offset,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_password_resets.count({ where }),
  ]);

  // Map to API output structure, mask reset_token, ensure date/time branding
  const data = rows.map((row) => ({
    id: row.id,
    discussion_board_user_id: row.discussion_board_user_id,
    reset_token: "********",
    expires_at: toISOStringSafe(row.expires_at),
    used_at:
      row.used_at !== null && row.used_at !== undefined
        ? toISOStringSafe(row.used_at)
        : null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : null,
  }));

  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
