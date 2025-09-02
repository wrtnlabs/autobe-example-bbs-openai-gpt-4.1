import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing tag (label/description/status) in the discussion board
 * (discussion_board_tags).
 *
 * This API allows an admin to update the label, description, or active status
 * of a tag used throughout the discussion board. Tag modifications may include
 * correcting spelling, updating descriptions to reflect community standards, or
 * toggling active status for moderation. The system enforces tag label
 * uniqueness and updates affected relationships across categories. Only admin
 * users have access to this endpoint to prevent unauthorized modifications to
 * the platform's taxonomy.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the update
 * @param props.tagId - UUID of the tag to update
 * @param props.body - Fields and new values for the tag update
 *   (IDiscussionBoardTag.IUpdate)
 * @returns The updated tag info as IDiscussionBoardTag
 * @throws {Error} When tag does not exist or is soft-deleted
 * @throws {Error} When updating the label to a value that is already in use
 */
export async function put__discussionBoard_admin_tags_$tagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardTag.IUpdate;
}): Promise<IDiscussionBoardTag> {
  const { tagId, body } = props;

  // 1. Find target tag, ensure not soft-deleted
  const tag = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: {
      id: tagId,
      deleted_at: null,
    },
  });
  if (!tag) {
    throw new Error("Tag not found, or has been deleted");
  }

  // 2. Prepare update object, only set defined fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updateData = {
    ...(body.label !== undefined ? { label: body.label } : {}),
    ...(body.description !== undefined
      ? { description: body.description }
      : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    updated_at: now,
  };

  // 3. Attempt update, catch duplicate label
  let updated;
  try {
    updated = await MyGlobal.prisma.discussion_board_tags.update({
      where: { id: tagId },
      data: updateData,
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Unique constraint violation (label)
      if (
        err.meta &&
        Array.isArray(err.meta.target) &&
        err.meta.target.includes("label")
      ) {
        throw new Error(
          "Tag label must be unique. The requested label is already in use.",
        );
      }
    }
    throw err;
  }

  // 4. Return converted entity
  return {
    id: updated.id,
    label: updated.label,
    description: updated.description ?? null,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
