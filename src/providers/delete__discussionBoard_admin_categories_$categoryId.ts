import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a discussion board category by ID.
 *
 * Soft-deletes the target category by setting deleted_at to the current
 * timestamp, preserving the record for compliance and potential recovery.
 * Deleted categories are excluded from future listings and cannot be used for
 * new post classification, though audit and system logs retain their
 * information.
 *
 * Only administrators may perform this operation. Attempts to delete
 * already-deleted or non-existent categories result in an error. Soft deletion
 * preserves data integrity for audit trails and system history.
 *
 * @param props - The request object
 * @param props.admin - The authenticated admin performing this operation
 *   (AdminPayload from decorator)
 * @param props.categoryId - Unique identifier of the category to soft delete
 * @returns Void
 * @throws {Error} If the category does not exist or is already deleted
 */
export async function delete__discussionBoard_admin_categories_$categoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the non-deleted category to ensure existence and not already soft-deleted
  const category = await MyGlobal.prisma.discussion_board_categories.findFirst({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
  });
  if (!category) {
    throw new Error("Category not found or already deleted");
  }

  // Step 2: Perform the soft delete (set deleted_at to now, ISO string)
  await MyGlobal.prisma.discussion_board_categories.update({
    where: {
      id: props.categoryId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // Step 3: Return void (no result)
}
