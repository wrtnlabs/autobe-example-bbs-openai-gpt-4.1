import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import { IPageIDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and paginate discussion_board_settings (system configuration/audit).
 *
 * This API endpoint delivers advanced search and pagination across discussion
 * board system settings, enabling filtering by key, value, or description.
 * Admins use this operation to quickly locate, review, or audit settings and
 * their changes, especially for system configuration and compliance
 * requirements. Pagination, sorting, and filter capabilities support efficient
 * UI and backend management for growing systems. Returning results includes all
 * metadata; sensitive values are not exposed to unauthorized users. Related
 * endpoints include individual setting CRUD.
 *
 * Authorization: Admin only.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin making the request
 * @param props.body - Filter and pagination criteria
 *   (IDiscussionBoardSetting.IRequest)
 * @returns Paginated list of settings matching the filter/search criteria
 * @throws {Error} When admin session is invalid or on database error
 */
export async function patch__discussionBoard_admin_settings(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSetting.IRequest;
}): Promise<IPageIDiscussionBoardSetting> {
  const { admin, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;

  // Build query conditions
  const where = {
    deleted_at: null,
    ...(body.key !== undefined && body.key !== null && { key: body.key }),
    ...(body.is_system !== undefined &&
      body.is_system !== null && { is_system: body.is_system }),
    ...(body.keyword !== undefined &&
    body.keyword !== null &&
    body.keyword.length > 0
      ? {
          OR: [
            { key: { contains: body.keyword, mode: "insensitive" as const } },
            { value: { contains: body.keyword, mode: "insensitive" as const } },
            {
              description: {
                contains: body.keyword,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  // Fetch data with pagination and sorting
  const [total, records] = await Promise.all([
    MyGlobal.prisma.discussion_board_settings.count({ where }),
    MyGlobal.prisma.discussion_board_settings.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
  ]);

  const data: IDiscussionBoardSetting[] = records.map((row) => ({
    id: row.id,
    key: row.key,
    value: row.value,
    description: row.description ?? null,
    is_system: row.is_system,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
