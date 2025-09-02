import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a discussion board category by ID.
 *
 * Updates the attributes of an existing discussion board category as an admin.
 * Supports updating name (must remain unique), description, is_active status,
 * and sort_order. Validates all changes against schema and business rules:
 * ensures category exists (not soft-deleted), catches duplicate name
 * constraint, and updates audit timestamps. Only accessible by authenticated
 * admin users.
 *
 * - Fails if the target category does not exist or is soft-deleted.
 * - Fails if updating name breaks the unique constraint (duplicate name).
 *
 * @param props - Input parameters:
 * @returns The updated IDiscussionBoardCategory object (all fields, date fields
 *   as ISO 8601 strings).
 * @throws {Error} If the category does not exist or is deleted.
 * @throws {Error} If updating name causes a uniqueness violation.
 * @field admin - Authenticated admin making the request (role check is enforced via decorator).
 * @field categoryId - Target category's UUID (must belong to an undeleted category).
 * @field body - Fields to update (PATCH semantics, all optional).
 */
export async function put__discussionBoard_admin_categories_$categoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCategory.IUpdate;
}): Promise<IDiscussionBoardCategory> {
  const { categoryId, body } = props;

  // 1. Fetch current (not deleted) category
  const category = await MyGlobal.prisma.discussion_board_categories.findFirst({
    where: {
      id: categoryId,
      deleted_at: null,
    },
  });
  if (!category) {
    throw new Error("Category not found or has been deleted");
  }

  // 2. If updating name, enforce unique constraint across non-deleted categories
  if (
    body.name !== undefined &&
    body.name !== null &&
    body.name !== category.name
  ) {
    const existing =
      await MyGlobal.prisma.discussion_board_categories.findFirst({
        where: {
          name: body.name,
          id: { not: categoryId },
          deleted_at: null,
        },
      });
    if (existing) {
      throw new Error("A category with this name already exists");
    }
  }

  // 3. Generate timestamp for updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 4. Perform the update; only set fields present in body (PATCH semantics)
  const updated = await MyGlobal.prisma.discussion_board_categories.update({
    where: { id: categoryId },
    data: {
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      is_active: body.is_active ?? undefined,
      sort_order: body.sort_order ?? undefined,
      updated_at: now,
    },
  });

  // 5. Return fully-typed category with ISO branded date fields
  return {
    id: updated.id,
    name: updated.name,
    description:
      typeof updated.description === "string" ? updated.description : null,
    is_active: updated.is_active,
    sort_order: updated.sort_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
