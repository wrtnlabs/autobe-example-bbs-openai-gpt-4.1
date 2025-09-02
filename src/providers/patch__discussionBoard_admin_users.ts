import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginated, advanced search of users (moderator/admin access)
 *
 * Search and list registered users of the discussion board with advanced
 * filtering by role-based access, sorting by registration, last login, and
 * other profile attributes. The operation supports pagination for large user
 * sets, and optionally restricts results to the caller's visibility according
 * to their role (admin can view all, moderators can view most, standard users
 * cannot access this endpoint).
 *
 * User details may include email, username, account status
 * (verified/suspended), and important timestamps. Sensitive data (like password
 * hashes) is never exposed in responses. This endpoint helps moderators and
 * admins enforce compliance, monitor growth, or intervene during incidents.
 *
 * Refer to the discussion_board_users Prisma schema for the full set of
 * accessible/returnable fields and use appropriate request and response types
 * to support scalable management workflows.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making this request
 *   (authorization validated)
 * @param props.body - User search criteria, including pagination and filters
 * @returns Paginated list of users (with all public/auditable fields, no
 *   password hashes)
 * @throws {Error} When underlying database query fails or authorization is
 *   invalid
 */
export async function patch__discussionBoard_admin_users(props: {
  admin: AdminPayload;
  body: IDiscussionBoardUser.IRequest;
}): Promise<IPageIDiscussionBoardUser> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build created_at range (if needed)
  const createdAtFilter =
    body.created_at_from || body.created_at_to
      ? {
          ...(body.created_at_from && { gte: body.created_at_from }),
          ...(body.created_at_to && { lte: body.created_at_to }),
        }
      : undefined;

  // Build where clause for Prisma
  const where = {
    deleted_at: null,
    ...(body.email && { email: body.email }),
    ...(body.username && { username: body.username }),
    ...(body.is_verified !== undefined && { is_verified: body.is_verified }),
    ...(body.is_suspended !== undefined && { is_suspended: body.is_suspended }),
    ...(createdAtFilter && { created_at: createdAtFilter }),
    ...(body.search && {
      OR: [
        { username: { contains: body.search, mode: "insensitive" as const } },
        { email: { contains: body.search, mode: "insensitive" as const } },
        {
          display_name: { contains: body.search, mode: "insensitive" as const },
        },
      ],
    }),
  };

  // Prepare orderBy inline (fix TS2464: computed property keys must be string)
  // Only allow sorting on safe fields to avoid SQL injection vector
  const ALLOWED_SORT_FIELDS = [
    "id",
    "email",
    "username",
    "display_name",
    "is_verified",
    "is_suspended",
    "last_login_at",
    "created_at",
    "updated_at",
  ];
  const sortField =
    body.sort_by && ALLOWED_SORT_FIELDS.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_users.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_users.count({ where }),
  ]);

  // Map DB users to output (using toISOStringSafe for all Date fields)
  const data = rows.map((user) => ({
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name ?? null,
    is_verified: user.is_verified,
    is_suspended: user.is_suspended,
    suspended_until:
      user.suspended_until !== null && user.suspended_until !== undefined
        ? toISOStringSafe(user.suspended_until)
        : null,
    last_login_at:
      user.last_login_at !== null && user.last_login_at !== undefined
        ? toISOStringSafe(user.last_login_at)
        : null,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at !== null && user.deleted_at !== undefined
        ? toISOStringSafe(user.deleted_at)
        : null,
  }));

  // Pagination object (must convert to plain number for brand safety)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    data,
  };
}
