import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Validate that only moderator/admin roles can delete moderation logs – deletion is forbidden for guests and for regular board members.
 *
 * Business context:
 * Moderation logs on the discussion board are privileged audit records. Only moderators and admins can manage (delete) them.
 * This test ensures deletion is strictly restricted and that non-moderator members and unauthenticated users (guests) are denied.
 *
 * Test workflow:
 * 1. Register a regular (non-moderator) member account
 * 2. Register a second moderator member (the actor for log creation)
 * 3. Create a moderation log record with moderator privileges
 * 4. Attempt to delete the log as a guest (with no authentication)
 *    - API should reject the attempt due to lack of authorization
 * 5. Attempt to delete the log as the regular (non-moderator) member
 *    - API should reject with forbidden error
 * 6. Confirm neither operation deletes the moderation log
 *
 * Implementation requirements:
 * - Must validate that forbidden errors are returned (do not check error message detail – only ensure error is raised)
 * - Do not test with type-level errors (e.g. missing required fields) – restrict to runtime role-based access control only
 */
export async function test_api_discussionBoard_test_delete_moderation_log_forbidden_for_non_admins(
  connection: api.IConnection,
) {
  // 1. Register a regular (non-moderator) member
  const regularMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<'email'>>(),
      hashed_password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.alphabets(12),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(regularMember);

  // 2. Register a second member to act as the moderator (simulate with separate account)
  const moderatorMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<'email'>>(),
      hashed_password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.alphabets(12),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(moderatorMember);

  // 3. Create a moderation log with the moderator's id (simulate log creation as privileged)
  const moderationLog = await api.functional.discussionBoard.moderationLogs.post(connection, {
    body: {
      moderator_id: moderatorMember.id,
      action: 'hide',
    } satisfies IDiscussionBoardModerationLog.ICreate,
  });
  typia.assert(moderationLog);

  // 4. Attempt to delete moderation log as a guest (simulate unauthenticated connection)
  TestValidator.error('guest cannot delete moderation log')(async () => {
    const guestConnection = { ...connection, headers: {} };
    await api.functional.discussionBoard.moderationLogs.eraseById(guestConnection, {
      id: moderationLog.id,
    });
  });

  // 5. Attempt to delete the moderation log as a regular (non-moderator) member
  //    This simulation only sets the user context to regular member – no privilege elevation
  const memberConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: `Bearer ${regularMember.id}` },
  };
  TestValidator.error('regular member cannot delete moderation log')(async () => {
    await api.functional.discussionBoard.moderationLogs.eraseById(memberConnection, {
      id: moderationLog.id,
    });
  });
  // 6. Optionally, validate that the log was not deleted (not possible here – actual read/api not provided)
}