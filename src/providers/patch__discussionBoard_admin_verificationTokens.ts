import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVerificationToken";
import { IPageIDiscussionBoardVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardVerificationToken";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated list of verification tokens for audit and
 * admin use.
 *
 * Retrieve a filtered, paginated list of verification tokens from the system
 * for investigation or administration purposes.
 *
 * This API allows authorized users (typically admin or moderator roles) to
 * search, filter, and paginate verification tokens issued for account
 * registration, password resets, or multi-factor authentication events. Query
 * filters may include purpose (such as 'email_verification', 'password_reset'),
 * issuance and expiration dates, and the user ID associated with the token.
 * Tokens that are expired, used, or revoked will be included or excluded in
 * results depending on filters.
 *
 * Security is paramount: token values are never returned directly. Only
 * summary/admin-safe fields, such as creation/expiry timestamps, usage
 * information, or token status, are exposed for administration and compliance.
 * This operation serves as an audit mechanism supporting business and
 * regulatory needs, with full traceability as described in the Prisma schema.
 * Only users with proper administrative or moderation privileges can call this
 * endpoint.
 *
 * @param props - Request parameters
 * @param props.admin - Payload representing the authenticated admin user
 * @param props.body - Search, filter, and pagination criteria
 * @returns Paginated set of verification token summary records matching search
 *   criteria.
 * @throws {Error} When database access fails or no admin authorization present
 */
export async function patch__discussionBoard_admin_verificationTokens(props: {
  admin: AdminPayload;
  body: IDiscussionBoardVerificationToken.IRequest;
}): Promise<IPageIDiscussionBoardVerificationToken.ISummary> {
  const { body } = props;

  // Normalize and validate pagination
  const defaultLimit = 20;
  const page = body.page && body.page > 0 ? Number(body.page) : 1;
  const limit =
    body.limit && body.limit > 0 ? Number(body.limit) : defaultLimit;

  // Build where conditions based on provided filters
  const where = {
    deleted_at: null as null, // soft delete filtering
    ...(body.purpose ? { purpose: body.purpose } : {}),
    ...(body.discussion_board_user_id
      ? { discussion_board_user_id: body.discussion_board_user_id }
      : {}),
    ...((body.expires_at_from !== undefined && body.expires_at_from !== null) ||
    (body.expires_at_to !== undefined && body.expires_at_to !== null)
      ? {
          expires_at: {
            ...(body.expires_at_from !== undefined &&
            body.expires_at_from !== null
              ? { gte: body.expires_at_from }
              : {}),
            ...(body.expires_at_to !== undefined && body.expires_at_to !== null
              ? { lte: body.expires_at_to }
              : {}),
          },
        }
      : {}),
    ...(body.used === true ? { used_at: { not: null as null } } : {}),
    ...(body.used === false ? { used_at: null as null } : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_verification_tokens.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        discussion_board_user_id: true,
        purpose: true,
        expires_at: true,
        used_at: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_verification_tokens.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total > 0 ? Math.ceil(total / Number(limit)) : 1,
    },
    data: rows.map((row) => ({
      id: row.id,
      discussion_board_user_id: row.discussion_board_user_id,
      purpose: row.purpose,
      expires_at: toISOStringSafe(row.expires_at),
      used_at:
        row.used_at !== null && row.used_at !== undefined
          ? toISOStringSafe(row.used_at)
          : null,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
