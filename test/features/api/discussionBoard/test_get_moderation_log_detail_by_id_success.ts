import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Validate that a specific moderation log entry can be retrieved in detail, including all key fields.
 *
 * This test ensures that, after creating a moderation log entry as a moderator, the log can be
 * fetched by its UUID, and all expected fields (moderator ID, action type, resource targets, timestamp)
 * are present and accurate. It also validates proper access (role authorization).
 *
 * Steps:
 * 1. Assign moderator role to a new member (prerequisite for log creation, only possible by admin or system).
 * 2. Create a moderation log entry using that moderator account (as only moderators can create logs).
 * 3. Fetch the moderation log by its UUID using the same authorized session.
 * 4. Assert the details in the fetched log match the data submitted for creation.
 * 5. Confirm all key fields exist and have correct format: moderator_id, action, created_at, and resource targets.
 */
export async function test_api_discussionBoard_test_get_moderation_log_detail_by_id_success(
  connection: api.IConnection,
) {
  // 1. Create a new member UUID (if member creation endpoint existed, use it)
  const moderatorMemberId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Assign moderator role to member
  const moderator = await api.functional.discussionBoard.moderators.post(connection, {
    body: { member_id: moderatorMemberId } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 3. Create a moderation log entry using the moderator
  const actionCode = "hide";
  const logCreate = await api.functional.discussionBoard.moderationLogs.post(connection, {
    body: {
      moderator_id: moderator.id,
      action: actionCode,
      thread_id: null,
      post_id: null,
      comment_id: null,
      action_reason: "Test moderation action."
    } satisfies IDiscussionBoardModerationLog.ICreate,
  });
  typia.assert(logCreate);

  // 4. Fetch the moderation log entry by UUID
  const logDetail = await api.functional.discussionBoard.moderationLogs.getById(connection, {
    id: logCreate.id,
  });
  typia.assert(logDetail);

  // 5. Validate key details
  TestValidator.equals("moderator ID matches")(logDetail.moderator_id)(moderator.id);
  TestValidator.equals("action matches")(logDetail.action)(actionCode);
  TestValidator.equals("action reason matches")(logDetail.action_reason)("Test moderation action.");
  TestValidator.equals("resource fields - thread_id")(logDetail.thread_id)(null);
  TestValidator.equals("resource fields - post_id")(logDetail.post_id)(null);
  TestValidator.equals("resource fields - comment_id")(logDetail.comment_id)(null);
  TestValidator.predicate("created_at is ISO date-time string")(
    !!logDetail.created_at && typeof logDetail.created_at === 'string'
  );
}