import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Validate referential integrity constraints for moderation log creation with invalid foreign keys.
 *
 * This test confirms that the API properly rejects attempts to create moderation log records referencing non-existent moderator IDs and resource targets (thread, post, comment).
 * It enforces robust input validation for audit and security.
 *
 * Steps:
 * 1. Create a valid administrator (as a contextual prerequisite)
 * 2. Attempt creation of moderation log with non-existent moderator_id (invalid FK)
 *    - Expected: Error due to invalid moderator FK
 * 3. Attempt creation of moderation log with invalid post_id but valid moderator
 *    - Expected: Error due to invalid post FK
 * 4. Attempt creation of moderation log with invalid comment_id but valid moderator
 *    - Expected: Error due to invalid comment FK
 */
export async function test_api_discussionBoard_test_create_moderation_log_with_invalid_foreign_keys(
  connection: api.IConnection,
) {
  // 1. Create a valid administrator for context (admin may not be used for FK, but is a scenario dependency)
  const validMemberId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
  const admin = await api.functional.discussionBoard.administrators.post(connection, {
    body: {
      member_id: validMemberId,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Attempt moderation log creation with invalid moderator_id (should fail)
  const invalidModeratorId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
  const invalidThreadId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should fail for invalid moderator_id")(
    () =>
      api.functional.discussionBoard.moderationLogs.post(connection, {
        body: {
          moderator_id: invalidModeratorId,
          thread_id: invalidThreadId,
          action: "delete",
          action_reason: "Intentional invalid moderator reference.",
        } satisfies IDiscussionBoardModerationLog.ICreate,
      }),
  );

  // 3. Attempt with invalid post_id, but valid moderator
  const invalidPostId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should fail for invalid post_id")(
    () =>
      api.functional.discussionBoard.moderationLogs.post(connection, {
        body: {
          moderator_id: admin.member_id,
          post_id: invalidPostId,
          action: "warn",
          action_reason: "Intentional invalid post reference.",
        } satisfies IDiscussionBoardModerationLog.ICreate,
      }),
  );

  // 4. Attempt with invalid comment_id, but valid moderator
  const invalidCommentId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should fail for invalid comment_id")(
    () =>
      api.functional.discussionBoard.moderationLogs.post(connection, {
        body: {
          moderator_id: admin.member_id,
          comment_id: invalidCommentId,
          action: "edit",
          action_reason: "Intentional invalid comment reference.",
        } satisfies IDiscussionBoardModerationLog.ICreate,
      }),
  );
}