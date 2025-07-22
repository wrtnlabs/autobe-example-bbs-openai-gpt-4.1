import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Test updating an existing moderation log entry by a moderator or administrator.
 *
 * This function validates both permission controls and audit integrity for updating moderation logs.
 * It ensures only authorized users can update log entries, edits are accurately reflected in the record,
 * and attempts by unauthorized users are strictly rejected.
 *
 * Workflow:
 * 1. Assign a moderator role to a test member
 * 2. Moderator creates a moderation log entry for any kind of moderation action (e.g., hide, warn)
 * 3. As the same moderator, update the moderation log via the PUT endpoint (editing fields like action_reason, action)
 * 4. Validate that the returned moderation log has the updated content and the original non-editable fields are unchanged
 * 5. Attempt to update the same moderation log as an unauthorized user and confirm it is rejected by the system.
 */
export async function test_api_discussionBoard_test_update_moderation_log_success(
  connection: api.IConnection,
) {
  // 1. Create a new member (simulate as test moderator)
  // This step is usually outside the given endpoints, so we will use a random UUID and valid email for the member_id.
  const moderator_member_id = typia.random<string & tags.Format<"uuid">>();

  // 2. Assign moderator role
  const moderator_assignment = await api.functional.discussionBoard.moderators.post(connection, {
    body: {
      member_id: moderator_member_id,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator_assignment);
  TestValidator.equals("assigned member_id")(moderator_assignment.member_id)(moderator_member_id);

  // 3. Moderator creates initial moderation log
  const initial_action = "warn";
  const initial_reason = "Initial violation - inappropriate language.";
  const moderation_log = await api.functional.discussionBoard.moderationLogs.post(connection, {
    body: {
      moderator_id: moderator_assignment.id,
      action: initial_action,
      action_reason: initial_reason,
    } satisfies IDiscussionBoardModerationLog.ICreate,
  });
  typia.assert(moderation_log);

  // 4. Update the moderation log fields as the assigned moderator
  const new_action = "hide";
  const new_reason = "Updated after review: content hidden for TOS violation.";
  const updated_log = await api.functional.discussionBoard.moderationLogs.putById(connection, {
    id: moderation_log.id,
    body: {
      action: new_action,
      action_reason: new_reason,
    } satisfies IDiscussionBoardModerationLog.IUpdate,
  });
  typia.assert(updated_log);
  // Validate that the update was successful
  TestValidator.equals("updated action")(updated_log.action)(new_action);
  TestValidator.equals("updated reason")(updated_log.action_reason)(new_reason);
  // Immutable fields should remain unchanged
  TestValidator.equals("moderator_id unchanged")(updated_log.moderator_id)(moderation_log.moderator_id);
  TestValidator.equals("created_at unchanged")(updated_log.created_at)(moderation_log.created_at);

  // 5. Attempt to update moderation log with a random/unauthorized user (should be rejected)
  await TestValidator.error("unauthorized update should fail")(async () => {
    await api.functional.discussionBoard.moderationLogs.putById(connection, {
      id: moderation_log.id,
      body: {
        action: "delete",
        action_reason: "Trying unauthorized update.",
      } satisfies IDiscussionBoardModerationLog.IUpdate,
    });
  });
}