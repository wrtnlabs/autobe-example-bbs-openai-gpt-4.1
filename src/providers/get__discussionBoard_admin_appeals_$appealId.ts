import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get details for a specific appeal by its ID.
 *
 * Retrieve appeal detail for the identified appeal. Returns all relevant
 * information for the appeal—including status, reason, timestamps, related
 * moderation/flag actions, and resolution comments. Permission logic ensures
 * that end users can retrieve their own appeals, while moderators/admins access
 * all details for their review purposes. The operation responds with full
 * detail for compliant auditing and user communications.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user performing the request
 * @param props.appealId - Unique identifier of the appeal to retrieve
 * @returns The detail record for the appeal with full status and context
 * @throws {Error} When the appeal record is not found or has been deleted
 */
export async function get__discussionBoard_admin_appeals_$appealId(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAppeal> {
  const { appealId } = props;
  const appeal = await MyGlobal.prisma.discussion_board_appeals.findFirst({
    where: {
      id: appealId,
      deleted_at: null,
    },
  });
  if (!appeal) {
    throw new Error("Appeal not found");
  }
  return {
    id: appeal.id,
    appellant_id: appeal.appellant_id,
    moderation_action_id: appeal.moderation_action_id ?? null,
    flag_report_id: appeal.flag_report_id ?? null,
    appeal_reason: appeal.appeal_reason,
    status: appeal.status,
    resolution_comment: appeal.resolution_comment ?? null,
    resolved_at: appeal.resolved_at
      ? toISOStringSafe(appeal.resolved_at)
      : null,
    created_at: toISOStringSafe(appeal.created_at),
    updated_at: toISOStringSafe(appeal.updated_at),
    deleted_at: appeal.deleted_at ? toISOStringSafe(appeal.deleted_at) : null,
  };
}
