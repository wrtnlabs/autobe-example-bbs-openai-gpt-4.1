import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test moderator-only soft-deletion error on nonexistent or already-deleted
 * post.
 *
 * This test ensures that when a moderator attempts to delete a post that
 * does not exist (or is already deleted), the API returns a proper error
 * (such as 404 Not Found or a business logic error) and does not succeed.
 *
 * Business context: Moderators must not be able to soft-delete posts that
 * are non-existent or already tombstoned. This checks for robust
 * existence/permission validation in the API layer for moderator actions.
 *
 * Steps:
 *
 * 1. Register as a new moderator (obtaining credentials/authorization).
 * 2. With authenticated moderator context, attempt to soft-delete a post using
 *    random/fabricated (nonexistent) threadId and postId.
 * 3. Verify that the API properly throws an error (expected: not found or
 *    business error) and does not succeed.
 */
export async function test_api_post_moderator_soft_delete_permission_error(
  connection: api.IConnection,
) {
  // 1. Register moderator and acquire authentication token for moderator role
  const moderatorJoin: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        consent: true,
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderatorJoin);
  // The connection's Authorization header is now set for moderator role

  // 2. Attempt to DELETE a fabricated postId and threadId (ensuring resource does not exist)
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "moderator cannot delete nonexistent or already-deleted post (should throw error)",
    async () => {
      await api.functional.discussionBoard.moderator.threads.posts.erase(
        connection,
        { threadId, postId },
      );
    },
  );
}
