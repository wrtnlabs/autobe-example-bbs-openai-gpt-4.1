import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new category for the discussion board.
 *
 * Creates a new category for classifying discussion posts and threads. Requires
 * a unique name, may include description, display/active status, and sort
 * order. Only admins are authorized to invoke this endpoint. Each new category
 * is created as active or staged per is_active flag, and is uniquely keyed by
 * name (enforced at the database/Prisma level). All date values are returned as
 * ISO8601 UTC strings for compliance.
 *
 * @param props - Request parameters
 * @param props.admin - The authenticated admin invoking the operation
 *   (AdminPayload)
 * @param props.body - The data for the new category
 *   (IDiscussionBoardCategory.ICreate)
 * @returns The newly created discussion board category
 *   (IDiscussionBoardCategory)
 * @throws {Error} If a category with the same name already exists, or if a
 *   Prisma/database error occurs
 */
export async function post__discussionBoard_admin_categories(props: {
  admin: AdminPayload;
  body: IDiscussionBoardCategory.ICreate;
}): Promise<IDiscussionBoardCategory> {
  const { admin, body } = props;

  // All authorization is handled upstream (AdminAuth decorator + adminAuthorize)

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discussion_board_categories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: body.name,
      description: body.description ?? null,
      is_active: body.is_active,
      sort_order: body.sort_order,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    name: created.name,
    description: created.description,
    is_active: created.is_active,
    sort_order: created.sort_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
