import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new tag for organizing content.
 *
 * This operation creates a new tag for use within categories and as a tool for
 * discussion board organization. Requires a unique label and optional
 * description, with is_active controlling immediate usability in tagging.
 * Strict validation ensures tag labels are unique among non-deleted tags. The
 * new tag is available for use immediately if active. Admin-level operation to
 * restrict taxonomy sprawl and support auditability.
 *
 * @param props - The request properties
 * @param props.admin - The authenticated admin creating the tag
 * @param props.body - The tag creation details: label, description, is_active
 * @returns The newly created tag with all metadata for business and audit use
 * @throws {Error} If a tag with the same label (and not deleted) already exists
 */
export async function post__discussionBoard_admin_tags(props: {
  admin: AdminPayload;
  body: IDiscussionBoardTag.ICreate;
}): Promise<IDiscussionBoardTag> {
  const { admin, body } = props;

  // Enforce label uniqueness among undeleted tags (application-level check for business clarity)
  const existing = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: {
      label: body.label,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new Error("A tag with this label already exists and is not deleted.");
  }

  // Prepare values
  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Insert new tag
  const created = await MyGlobal.prisma.discussion_board_tags.create({
    data: {
      id: id,
      label: body.label,
      description: body.description ?? null,
      is_active: body.is_active,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return full tag API object, all date/datetime fields as required types
  return {
    id: created.id,
    label: created.label,
    description: created.description ?? null,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
