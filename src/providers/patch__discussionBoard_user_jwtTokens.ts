import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardJwtToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardJwtToken";
import { IPageIDiscussionBoardJwtToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardJwtToken";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * List/manage a user's active and historical JWT token sessions.
 *
 * Provides a paginated, queryable list of the current user's active JWT token
 * sessions. This enables users to see which devices and locations have active
 * sessions, supporting device/session management features such as forced
 * logout, audit, and compliance review. Uses the discussion_board_jwt_tokens
 * table. Tokens returned are only for the authenticated user, never others.
 *
 * Filtering supports: status (active, expired, revoked), issued time range,
 * expiry time range, device info substring, and pagination.
 *
 * @param props - The request properties.
 * @param props.user - Authenticated user info (UserPayload)
 * @param props.body - Filtering, sorting, and pagination options for JWT token
 *   query.
 * @returns Paginated set of JWT token session summaries for the user
 * @throws {Error} If database query fails or if logic presents unexpected
 *   scenario.
 */
export async function patch__discussionBoard_user_jwtTokens(props: {
  user: UserPayload;
  body: IDiscussionBoardJwtToken.IRequest;
}): Promise<IPageIDiscussionBoardJwtToken.ISummary> {
  const { user, body } = props;

  // Cap limit for sanity
  const rawPage = body.page ?? 1;
  const page = Number(rawPage) >= 1 ? Number(rawPage) : 1;
  const rawLimit = body.limit ?? 20;
  const limit = Math.min(Math.max(Number(rawLimit), 1), 50);
  const skip = (page - 1) * limit;

  // Time now in ISO8601 for status comparisons
  const now = toISOStringSafe(new Date());

  // Build filters for Prisma where clause
  const where = {
    discussion_board_user_id: user.id,
    deleted_at: null,
    // Device info substring match (case-insensitive)
    ...(body.device_info
      ? {
          device_info: {
            contains: body.device_info,
            mode: "insensitive" as const,
          },
        }
      : {}),
    // Issue time range filters
    ...(body.issued_at_from || body.issued_at_to
      ? {
          issued_at: {
            ...(body.issued_at_from ? { gte: body.issued_at_from } : {}),
            ...(body.issued_at_to ? { lte: body.issued_at_to } : {}),
          },
        }
      : {}),
    // Expiry time range filters
    ...(body.expired_at_from || body.expired_at_to
      ? {
          expires_at: {
            ...(body.expired_at_from ? { gte: body.expired_at_from } : {}),
            ...(body.expired_at_to ? { lte: body.expired_at_to } : {}),
          },
        }
      : {}),
    // Status logic (pick one)
    ...(body.status === "active"
      ? {
          revoked_at: null,
          expires_at: { gt: now },
        }
      : body.status === "expired"
        ? {
            expires_at: { lt: now },
          }
        : body.status === "revoked"
          ? {
              revoked_at: { not: null },
            }
          : {}),
  };

  // Fetch paged data and count (parallel)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_jwt_tokens.findMany({
      where,
      orderBy: { issued_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_jwt_tokens.count({ where }),
  ]);

  // Transform rows to ISummary (convert all Date fields, handle nullables)
  const data = rows.map(
    (token): IDiscussionBoardJwtToken.ISummary => ({
      id: token.id,
      discussion_board_user_id: token.discussion_board_user_id,
      token: token.token,
      issued_at: toISOStringSafe(token.issued_at),
      expires_at: toISOStringSafe(token.expires_at),
      revoked_at: token.revoked_at ? toISOStringSafe(token.revoked_at) : null,
      device_info:
        typeof token.device_info === "string" ? token.device_info : null,
      created_at: toISOStringSafe(token.created_at),
      updated_at: toISOStringSafe(token.updated_at),
      deleted_at: token.deleted_at ? toISOStringSafe(token.deleted_at) : null,
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
    data,
  };
}
