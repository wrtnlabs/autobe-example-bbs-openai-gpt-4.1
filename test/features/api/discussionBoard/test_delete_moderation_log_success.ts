import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Validate deletion (soft-delete) of a discussion board moderation log entry by a privileged moderator.
 *
 * This test simulates the privileged workflow: assigns moderator privileges to a member, creates a moderation log
 * (e.g., action 'warn'), deletes (soft-deletes) it, and verifies correct audit behavior. Steps:
 *
 * 1. Assign a moderator to a (random) member.
 * 2. Create a moderation log entry as that moderator.
 * 3. Soft-delete the moderation log by ID and confirm API response.
 * 4. Attempt to delete a non-existent moderation log (should error).
 *
 * Coverage:
 * - API-level deletion, audit UUID echo, and error on missing log.
 * - Exclusion from standard queries or further audit log retrieval is not asserted (no such APIs available).
 */
export async function test_api_discussionBoard_test_delete_moderation_log_success(
  connection: api.IConnection,
) {
  // 1. Assign moderator privileges to a new member (randomly-generated UUID)
  const member_id = typia.random<string & tags.Format<"uuid">>();
  const moderator = await api.functional.discussionBoard.moderators.post(connection, {
    body: {
      member_id,
    },
  });
  typia.assert(moderator);
  TestValidator.equals("moderator assignment")(moderator.member_id)(member_id);

  // 2. Create a new moderation log entry using this moderator
  const logInput = {
    moderator_id: moderator.id,
    action: "warn",
    action_reason: "Test warning for delete operation.",
  } satisfies IDiscussionBoardModerationLog.ICreate;
  const log = await api.functional.discussionBoard.moderationLogs.post(connection, {
    body: logInput,
  });
  typia.assert(log);
  TestValidator.equals("log moderator")(log.moderator_id)(moderator.id);
  TestValidator.equals("log action")(log.action)("warn");

  // 3. Delete (soft-delete) the moderation log by ID
  const eraseResult = await api.functional.discussionBoard.moderationLogs.eraseById(connection, {
    id: log.id,
  });
  typia.assert(eraseResult);
  TestValidator.equals("deletion success")(eraseResult.success)(true);
  TestValidator.equals("deleted_log_id matches")(eraseResult.deleted_log_id)(log.id);

  // 4. Attempt to delete a non-existent moderation log entry (should error)
  await TestValidator.error("deleting a missing log entry should fail")(
    () => api.functional.discussionBoard.moderationLogs.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    })
  );

  // Note: There is no list/search/audit query API provided, so cannot check soft-delete visibility or audit trail here.
}