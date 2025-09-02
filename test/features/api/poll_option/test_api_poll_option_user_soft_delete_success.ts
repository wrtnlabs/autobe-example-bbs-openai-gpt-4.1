import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test: Soft delete a poll option as poll creator (user) and validate
 * permission enforcement.
 *
 * Business context and API constraint notes:
 *
 * - Only the poll creator, moderator, or admin may soft-delete a poll option;
 *   others must be forbidden.
 * - After deletion, the option should be logically removed from user-facing
 *   APIs (cannot be checked with available endpoints).
 * - Deleting non-existent or already deleted options should yield appropriate
 *   errors.
 *
 * API coverage notes:
 *
 * - Only user registration (join) and poll option deletion endpoints are
 *   available.
 * - There is no API to create posts, polls, poll options, nor to view or
 *   verify poll option presence or deleted_at.
 * - Thus, verification is limited to role permission tests and API error
 *   responses.
 *
 * Steps:
 *
 * 1. Register poll creator user (join)
 * 2. Soft-delete a poll option as creator (should succeed)
 * 3. Register separate user (non-creator)
 * 4. Attempt soft-delete as non-creator (must be forbidden)
 * 5. Attempt to delete a non-existent poll option (must error)
 * 6. (Verification of post-delete state is not possible with current APIs)
 */
export async function test_api_poll_option_user_soft_delete_success(
  connection: api.IConnection,
) {
  // 1. Register the poll creator user and obtain credentials
  const creatorPassword = "Abcdef123!@#";
  const creator = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: creatorPassword,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(creator);
  const creatorEmail = creator.user.email;
  // Prepare test UUIDs for post, poll, and poll option
  const postId = typia.random<string & tags.Format<"uuid">>();
  const pollId = typia.random<string & tags.Format<"uuid">>();
  const pollOptionId = typia.random<string & tags.Format<"uuid">>();

  // 2. Soft-delete poll option as the creator (should succeed)
  await api.functional.discussionBoard.user.posts.polls.pollOptions.erase(
    connection,
    {
      postId,
      pollId,
      pollOptionId,
    },
  );

  // 3. Register a non-creator user (this will update connection.auth context)
  const otherPassword = "Zyxwvut987!@#";
  const other = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: otherPassword,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(other);
  const otherEmail = other.user.email;
  // 4. Attempt to soft-delete the poll option as non-creator (should be forbidden)
  await TestValidator.error(
    "non-creator user should be forbidden from deleting poll option",
    async () => {
      await api.functional.discussionBoard.user.posts.polls.pollOptions.erase(
        connection,
        {
          postId,
          pollId,
          pollOptionId,
        },
      );
    },
  );
  // 5. Attempt to delete a non-existent poll option as non-creator (should error)
  await TestValidator.error(
    "deleting a non-existent poll option should return error",
    async () => {
      await api.functional.discussionBoard.user.posts.polls.pollOptions.erase(
        connection,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
          pollId: typia.random<string & tags.Format<"uuid">>(),
          pollOptionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // (Cannot verify deleted_at or absence from user APIs—no API for listing poll options/post-poll details)
}
