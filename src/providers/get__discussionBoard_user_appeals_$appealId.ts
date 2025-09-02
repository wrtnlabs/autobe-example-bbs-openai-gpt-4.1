import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { UserPayload } from "../decorators/payload/UserPayload";

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
 * @param props.user - The authenticated user making the request (must match the
 *   appeal appellant)
 * @param props.appealId - Unique identifier of the appeal to retrieve
 * @returns The detail record for the appeal with full status and context
 * @throws {Error} When the appeal does not exist
 * @throws {Error} When the appeal does not belong to the requesting user
 */
export async function get__discussionBoard_user_appeals_$appealId(props: {
  user: UserPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAppeal> {
  const { user, appealId } = props;
  const appeal = await MyGlobal.prisma.discussion_board_appeals.findFirst({
    where: {
      id: appealId,
      deleted_at: null,
    },
  });
  if (!appeal) throw new Error("Appeal not found");
  if (appeal.appellant_id !== user.id) {
    throw new Error("Access denied: not your appeal");
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
