import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate fetching a post that does not exist (using random threadId and
 * postId).
 *
 * This test ensures the API correctly returns a not-found error when
 * attempting to retrieve a post with random, non-existent IDs. According to
 * the API spec, no authentication is required to fetch thread/post
 * details.
 *
 * ## Steps:
 *
 * 1. Generate random UUIDs for threadId and postId that have virtually no
 *    chance to exist in the database.
 * 2. Attempt to fetch the post using those IDs via
 *    `api.functional.discussionBoard.threads.posts.at`.
 * 3. Validate that the API responds with a not-found error (404), proving it
 *    does not leak or return data for IDs that do not exist.
 * 4. Do not assert response structure, just that an error is raised for
 *    missing resource.
 */
export async function test_api_post_details_not_found(
  connection: api.IConnection,
) {
  // Step 1: Generate random UUIDs for threadId and postId
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();

  // Step 2&3: Validate not-found error is thrown for non-existent post
  await TestValidator.error(
    "Fetching a non-existent post should return 404 not-found error",
    async () => {
      await api.functional.discussionBoard.threads.posts.at(connection, {
        threadId,
        postId,
      });
    },
  );
}
