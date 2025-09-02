import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information for a specific discussion board category by ID.
 *
 * This endpoint returns all metadata fields for a single category, including
 * ID, name, description (optional), active status, sort order, and full audit
 * timestamps. Used for admin dashboard workflows or in public UI for category
 * detail. Only accessible by users with admin privileges. Soft-deleted
 * categories are excluded.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 *   (authorization enforced by controller/event)
 * @param props.categoryId - Unique identifier (UUID) for the target discussion
 *   board category
 * @returns Complete information about the requested category, matching
 *   IDiscussionBoardCategory structure
 * @throws {Error} When the target category is not found or is soft-deleted
 */
export async function get__discussionBoard_admin_categories_$categoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCategory> {
  const { admin, categoryId } = props;
  // Query single, non-deleted category
  const category = await MyGlobal.prisma.discussion_board_categories.findFirst({
    where: { id: categoryId, deleted_at: null },
  });
  if (!category) throw new Error("Discussion board category not found");
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? null,
    is_active: category.is_active,
    sort_order: category.sort_order,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at:
      category.deleted_at !== undefined && category.deleted_at !== null
        ? toISOStringSafe(category.deleted_at)
        : null,
  };
}
