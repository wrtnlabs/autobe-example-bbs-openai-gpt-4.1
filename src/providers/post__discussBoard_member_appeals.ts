import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAppeal";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new appeal of a moderation action (authenticated member only) in
 * discuss_board_appeals.
 *
 * This operation allows a member to submit a new appeal against a moderation
 * action, recorded in the discuss_board_appeals table. Only members targeted by
 * the moderation action may appeal, and duplicate appeals are not permitted.
 * Validation ensures appealable actions and enforces proper member standing.
 * Resulting appeals are created with status 'pending' and are accessible for
 * moderator/admin review workflows.
 *
 * @param props - Object containing:
 *
 *   - Member: The authenticated member's JWT payload (id is user_account_id from
 *       discuss_board_user_accounts)
 *   - Body: IDiscussBoardAppeal.ICreate containing moderation_action_id (UUID of
 *       the action being appealed) and appeal_rationale (text argument)
 *
 * @returns IDiscussBoardAppeal - Newly created appeal object with populated
 *   fields for audit/compliance
 * @throws {Error} When member is not active, moderation action is missing or
 *   does not target member, or if duplicate appeal exists
 */
export async function post__discussBoard_member_appeals(props: {
  member: MemberPayload;
  body: IDiscussBoardAppeal.ICreate;
}): Promise<IDiscussBoardAppeal> {
  const { member, body } = props;

  // 1. Locate member entity, verify status
  const memberRow = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      user_account_id: member.id,
      status: "active",
      deleted_at: null,
    },
  });
  if (memberRow === null) {
    throw new Error("Active member not found");
  }

  // 2. Look up moderation action and confirm it targets this member
  const moderationAction =
    await MyGlobal.prisma.discuss_board_moderation_actions.findFirst({
      where: {
        id: body.moderation_action_id,
        deleted_at: null,
      },
    });
  if (moderationAction === null) {
    throw new Error("Moderation action does not exist or has been removed");
  }
  if (
    !moderationAction.target_member_id ||
    moderationAction.target_member_id !== memberRow.id
  ) {
    throw new Error(
      "You can only appeal moderation actions taken directly against your own account.",
    );
  }

  // 3. Check for duplicate, undeleted appeal for this action & member
  const duplicateAppeal = await MyGlobal.prisma.discuss_board_appeals.findFirst(
    {
      where: {
        moderation_action_id: body.moderation_action_id,
        appellant_member_id: memberRow.id,
        deleted_at: null,
      },
    },
  );
  if (duplicateAppeal !== null) {
    throw new Error(
      "An appeal for this moderation action is already in progress.",
    );
  }

  // 4. Timestamps (always ISO8601, string & tags.Format<'date-time'>)
  const now = toISOStringSafe(new Date());

  // 5. Create and persist appeal record
  const created = await MyGlobal.prisma.discuss_board_appeals.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderation_action_id: body.moderation_action_id,
      appellant_member_id: memberRow.id,
      appeal_rationale: body.appeal_rationale,
      status: "pending",
      resolution_notes: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 6. Return as DTO, all dates string & tags.Format<'date-time'>
  return {
    id: created.id,
    moderation_action_id: created.moderation_action_id,
    appellant_member_id: created.appellant_member_id,
    appeal_rationale: created.appeal_rationale,
    status: created.status,
    resolution_notes: created.resolution_notes ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
