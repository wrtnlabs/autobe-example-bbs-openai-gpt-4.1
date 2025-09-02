import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test moderator cannot soft-delete non-existent or already deleted
 * comments.
 *
 * This test validates that when a moderator attempts to soft-delete (erase)
 * a comment that does not exist (or a comment already deleted), the system
 * returns an error. The test intentionally does not create any actual
 * threads, posts, or comments—its purpose is to verify proper error
 * handling on invalid or redundant moderation attempts.
 *
 * Steps:
 *
 * 1. Register and authenticate a new moderator, obtaining an access token.
 * 2. Attempt to soft-delete a comment by issuing the erase call with random
 *    UUIDs for threadId, postId, and commentId, guaranteeing the target
 *    does not exist.
 * 3. Assert the server responds with an error (HTTP 404 Not Found or
 *    business-specific error for already deleted).
 * 4. Repeat the soft-delete request using the same random UUIDs to verify
 *    repeated attempts also produce the error.
 * 5. Do not create threads, posts, or comments—the scenario strictly evaluates
 *    error-path business logic for moderation.
 */
export async function test_api_comment_soft_delete_moderator_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as moderator
  const mJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(10),
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(mJoin);

  // 2. Generate guaranteed-nonexistent thread, post, and comment IDs
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to soft-delete the (non-existent) comment, expect error
  await TestValidator.error(
    "moderator cannot soft-delete non-existent comment",
    async () => {
      await api.functional.discussionBoard.moderator.threads.posts.comments.erase(
        connection,
        {
          threadId,
          postId,
          commentId,
        },
      );
    },
  );

  // 4. Repeat the soft-delete request to validate behavior on repeated deletion attempt
  await TestValidator.error(
    "repeated soft-delete attempt for non-existent or already deleted comment fails",
    async () => {
      await api.functional.discussionBoard.moderator.threads.posts.comments.erase(
        connection,
        {
          threadId,
          postId,
          commentId,
        },
      );
    },
  );
}
