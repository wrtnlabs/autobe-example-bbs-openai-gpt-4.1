import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Create a new appeal against a moderation action or flag report.
 *
 * Submit a new appeal to challenge a moderation action or flag report. Users
 * provide a reason, reference to the moderation action or flag report being
 * appealed, and any supporting narrative. Only authorized users may submit
 * appeals for affected actions/reports; duplicates are disallowed. Successful
 * creation records the lifecycle start for the appeal and notifies moderation
 * for handling.
 *
 * End users can only appeal moderation actions or reports affecting their own
 * activity. Permissions and eligibility are validated. All appeal creation
 * actions are recorded for compliance review and appeal queueing. This endpoint
 * helps uphold user rights and platform transparency.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user submitting the appeal (must match
 *   appellant_id)
 * @param props.body - Information required to start a new appeal (appellant_id,
 *   moderation_action_id or flag_report_id, appeal_reason)
 * @returns The created appeal record (IDiscussionBoardAppeal)
 * @throws {Error} If user is not authorized to submit appeal
 * @throws {Error} If both moderation_action_id and flag_report_id are
 *   missing/null
 * @throws {Error} If duplicate appeal exists for same user/action/flag
 */
export async function post__discussionBoard_user_appeals(props: {
  user: UserPayload;
  body: IDiscussionBoardAppeal.ICreate;
}): Promise<IDiscussionBoardAppeal> {
  const { user, body } = props;

  // Authorization: Only user can appeal on their own behalf
  if (user.id !== body.appellant_id) {
    throw new Error(
      "You are not authorized to create an appeal for another user",
    );
  }

  // At least one of the moderation_action_id or flag_report_id must be non-null
  if (body.moderation_action_id == null && body.flag_report_id == null) {
    throw new Error(
      "You must provide a moderation_action_id or flag_report_id",
    );
  }

  // Prevent duplicate appeals (unique index: appellant_id, moderation_action_id, flag_report_id)
  const duplicate = await MyGlobal.prisma.discussion_board_appeals.findFirst({
    where: {
      appellant_id: body.appellant_id,
      moderation_action_id: body.moderation_action_id,
      flag_report_id: body.flag_report_id,
    },
  });
  if (duplicate) {
    throw new Error(
      "Duplicate appeal already exists for this moderation action or flag report",
    );
  }

  const now = toISOStringSafe(new Date());

  // Create new appeal
  const created = await MyGlobal.prisma.discussion_board_appeals.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      appellant_id: body.appellant_id,
      moderation_action_id: body.moderation_action_id ?? null,
      flag_report_id: body.flag_report_id ?? null,
      appeal_reason: body.appeal_reason,
      status: "pending",
      resolution_comment: null,
      resolved_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    appellant_id: created.appellant_id as string & tags.Format<"uuid">,
    moderation_action_id: created.moderation_action_id ?? null,
    flag_report_id: created.flag_report_id ?? null,
    appeal_reason: created.appeal_reason,
    status: created.status,
    resolution_comment: created.resolution_comment ?? null,
    resolved_at: created.resolved_at
      ? toISOStringSafe(created.resolved_at)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
