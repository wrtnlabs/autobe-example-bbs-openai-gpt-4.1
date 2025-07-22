import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Test successful creation of a moderation log entry by a properly authorized moderator.
 *
 * Business context:
 * - Moderation logs are intended to provide an immutable audit trail for actions performed by official moderators (or admins) on various resources (threads, posts, comments) in the discussion board system.
 * - Only users with valid, active moderator privileges are permitted to write this log.
 * - Each log entry must clearly record the acting moderator, action type, action reason (if applicable), and exactly one target resource (at least one of thread_id, post_id, or comment_id).
 *
 * Steps:
 * 1. Prepare: (If not already present:) Create a valid test member representing a user who can be granted moderator rights.
 * 2. Grant moderator privileges: Use the moderators endpoint to assign the test user as a moderator, verifying result.
 * 3. Create a new moderation log: Use a valid action type (e.g., 'delete', 'hide', etc.), the newly created moderator's id, and reference a fake, plausible thread/post/comment UUID for the target resource.
 * 4. Validate success:
 *    - Moderation log entry is returned (not null or error)
 *    - The log correctly references the input moderator_id, action type, and target resource
 *    - Timestamps are present and of proper format
 *    - No audit fields are missing
 *
 * Edge:
 * - (If supported by API) Try to create a moderation log with an invalid moderator id and confirm that an error is thrown, to validate authorization enforcement. (If not available, document omission.)
 */
export async function test_api_discussionBoard_test_create_moderation_log_success(
  connection: api.IConnection,
) {
  // 1. Preparation: Create a plausible member UUID to assign as moderator (simulate member creation, as no endpoint is provided)
  const member_id = typia.random<string & tags.Format<'uuid'>>();

  // 2. Assign moderator privileges
  const moderator = await api.functional.discussionBoard.moderators.post(connection, {
    body: { member_id } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.equals('moderator assignment')(moderator.member_id)(member_id);
  TestValidator.predicate('assigned_at is iso8601')(!!moderator.assigned_at && !isNaN(Date.parse(moderator.assigned_at)));
  TestValidator.equals('revoked_at is null')(moderator.revoked_at)(null);

  // 3. Create a moderation log entry referencing valid action, moderator, and target (thread only for this test)
  const action = 'delete';
  const thread_id = typia.random<string & tags.Format<'uuid'>>();
  const moderationLog = await api.functional.discussionBoard.moderationLogs.post(connection, {
    body: {
      moderator_id: moderator.id,
      thread_id,
      action,
      action_reason: 'Rule violation (spam advertising)',
    } satisfies IDiscussionBoardModerationLog.ICreate,
  });
  typia.assert(moderationLog);
  TestValidator.equals('log moderator_id')(moderationLog.moderator_id)(moderator.id);
  TestValidator.equals('log thread_id')(moderationLog.thread_id)(thread_id);
  TestValidator.equals('log action')(moderationLog.action)(action);
  TestValidator.predicate('created_at is ISO date')(!!moderationLog.created_at && !isNaN(Date.parse(moderationLog.created_at)));
  TestValidator.equals('action_reason')(moderationLog.action_reason)('Rule violation (spam advertising)');

  // Edge: Try to create log with invalid moderator id (should throw error)
  await TestValidator.error('invalid moderator ID forbidden')(async () => {
    await api.functional.discussionBoard.moderationLogs.post(connection, {
      body: {
        moderator_id: typia.random<string & tags.Format<'uuid'>>(), // random id (not assigned to any moderator)
        thread_id: typia.random<string & tags.Format<'uuid'>>(),
        action: 'hide',
      },
    });
  });
}