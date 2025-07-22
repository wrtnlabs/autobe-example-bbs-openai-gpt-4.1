import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate API error response when fetching a non-existent discussion board post.
 *
 * This test confirms that requesting details for a post using a random (invalid/nonexistent) UUID returns a 'not found' error response, regardless of user role. It ensures API consistency and reliability in error handling for undefined records.
 *
 * Steps:
 * 1. Generate a random valid UUID which is very unlikely to correspond to any actual discussion board post (ensuring the post does not exist).
 * 2. Attempt to fetch the post by ID.
 * 3. Validate that the API returns a not-found error (typically HTTP 404 or equivalent error response).
 * 4. (Optional) Repeat under different user authentication states/roles if possible, to confirm consistent error behavior (in this minimal scenario, only a public/anonymous or default state is checked).
 */
export async function test_api_discussionBoard_test_get_post_details_not_found(
  connection: api.IConnection,
) {
  // 1. Generate random post UUID (extremely unlikely to exist)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // 2 & 3. Attempt to fetch, expect an error response
  await TestValidator.error("fetching non-existent post should fail")(
    async () => {
      await api.functional.discussionBoard.posts.getById(connection, {
        id: nonExistentId,
      });
    },
  );
}