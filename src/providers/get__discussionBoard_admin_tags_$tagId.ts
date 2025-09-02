import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get details about a specific discussion board tag.
 *
 * Fetch a complete detail record for a single tag specified by its unique
 * tagId. The response includes label, description, activation status, audit
 * timestamps, and any admin-level details relevant to management or
 * moderation.
 *
 * Access is controlled for sensitive or inactive tags, but public tags may be
 * visible depending on system configuration. Enables UI workflows such as tag
 * editing, merging, or detail popovers in tag suggestion lists.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin performing the request (must have
 *   admin role)
 * @param props.tagId - Unique identifier of the target tag (UUID)
 * @returns Full detail record of the requested tag, matching
 *   IDiscussionBoardTag
 * @throws {Error} When the specified tag does not exist (404)
 */
export async function get__discussionBoard_admin_tags_$tagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardTag> {
  const { tagId } = props;

  const tag = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: { id: tagId },
  });

  if (!tag) {
    throw new Error("Tag not found");
  }

  return {
    id: tag.id,
    label: tag.label,
    description: tag.description ?? null,
    is_active: tag.is_active,
    created_at: toISOStringSafe(tag.created_at),
    updated_at: toISOStringSafe(tag.updated_at),
    deleted_at: tag.deleted_at ? toISOStringSafe(tag.deleted_at) : null,
  };
}
