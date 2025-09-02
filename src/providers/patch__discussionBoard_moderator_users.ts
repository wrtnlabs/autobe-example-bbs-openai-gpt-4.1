import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

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
 * @param props - Request properties
 * @param props.moderator - Authenticated moderator user payload
 * @param props.body - User search criteria (filters, sort, pagination)
 * @returns Paginated filtered user list compliant with DTO; never includes
 *   password hashes
 * @throws {Error} When authentication or access is insufficient or input values
 *   invalid
 */
export async function patch__discussionBoard_moderator_users(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardUser.IRequest;
}): Promise<IPageIDiscussionBoardUser> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Only permit sorting on whitelisted fields
  const allowedSortFields = [
    "id",
    "email",
    "username",
    "display_name",
    "is_verified",
    "is_suspended",
    "suspended_until",
    "last_login_at",
    "created_at",
    "updated_at",
  ];
  const sortField =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  // WHERE clause with all filters applied and only schema fields
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.email !== undefined &&
      body.email !== null && { email: body.email }),
    ...(body.username !== undefined &&
      body.username !== null && { username: body.username }),
    ...(body.is_verified !== undefined &&
      body.is_verified !== null && { is_verified: body.is_verified }),
    ...(body.is_suspended !== undefined &&
      body.is_suspended !== null && { is_suspended: body.is_suspended }),
    ...(body.search && {
      OR: [
        { username: { contains: body.search, mode: "insensitive" as const } },
        { email: { contains: body.search, mode: "insensitive" as const } },
        {
          display_name: { contains: body.search, mode: "insensitive" as const },
        },
      ],
    }),
    ...(body.created_at_from || body.created_at_to
      ? {
          created_at: {
            ...(body.created_at_from && { gte: body.created_at_from }),
            ...(body.created_at_to && { lte: body.created_at_to }),
          },
        }
      : {}),
  };

  // Inline, literal object for orderBy
  const orderBy = allowedSortFields.includes(sortField)
    ? { [sortField]: sortOrder as "asc" | "desc" }
    : { created_at: sortOrder as "asc" | "desc" };

  // Fetch users and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_users.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        is_verified: true,
        is_suspended: true,
        suspended_until: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_users.count({ where }),
  ]);

  // Transform results to required DTO (branded string/date fields, nulls handled)
  const data = rows.map((row) => ({
    id: row.id as string & tags.Format<"uuid">,
    email: row.email,
    username: row.username,
    display_name: row.display_name ?? null,
    is_verified: row.is_verified,
    is_suspended: row.is_suspended,
    suspended_until: row.suspended_until
      ? toISOStringSafe(row.suspended_until)
      : null,
    last_login_at: row.last_login_at
      ? toISOStringSafe(row.last_login_at)
      : null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
