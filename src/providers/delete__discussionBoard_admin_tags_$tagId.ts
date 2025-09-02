import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a tag in the discussion_board_tags table (taxonomy/tag
 * management).
 *
 * This endpoint allows administrators to disable or remove a tag from the
 * taxonomy by performing a soft delete operation. The deleted_at field marks
 * the tag as unavailable for new categorization, but the tag remains in the
 * database for audit and compliance reasons. Existing category or post
 * relationships referencing the tag remain unchanged, supporting historical
 * analysis. Only admin users may access this endpoint to prevent loss of
 * platform structure. Operation errors include not found and permission denial.
 * To restore a tag, use a separate (not provided here) undelete/recover
 * endpoint.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the delete
 * @param props.tagId - Unique identifier of the tag to soft delete
 * @returns Void
 * @throws {Error} When the tag cannot be found
 * @throws {Error} When props.admin is missing or does not have admin role
 */
export async function delete__discussionBoard_admin_tags_$tagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, tagId } = props;
  // 🔐 Authorization: must reference and check admin payload by contract
  if (!admin || admin.type !== "admin") {
    throw new Error("Unauthorized: admin role required");
  }
  // Find tag by id, throw if not found (required for correct 404 handling)
  const tag = await MyGlobal.prisma.discussion_board_tags.findUnique({
    where: { id: tagId },
  });
  if (!tag) {
    throw new Error("Tag not found");
  }
  // 🟢 Soft delete: set deleted_at (idempotent; always uses current time)
  await MyGlobal.prisma.discussion_board_tags.update({
    where: { id: tagId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
