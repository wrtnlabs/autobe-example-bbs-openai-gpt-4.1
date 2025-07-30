import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVersion";

/**
 * Attempt to retrieve post version history for a non-existent post.
 *
 * This test verifies that when attempting to list all version snapshots for a
 * postId that is not present in the system, the API behaves correctly. It
 * should either throw a not-found/domain error (preferred RESTful behavior), or
 * return a paginated structure with an empty versions array (if business logic
 * prefers empty results for missing resources).
 *
 * Steps:
 *
 * 1. Generate a random UUID to act as a non-existent postId (not in the database).
 * 2. Attempt to fetch the version list using the API endpoint under test.
 * 3. Accept either of two valid behaviors: a) API throws a not-found or business
 *    error (e.g., 404/domain error) b) API returns a paged object with empty
 *    data array (no history found)
 * 4. Fail if any version objects are returned for the fake postId (data leak).
 *
 * This test ensures proper not-found handling and that the endpoint never
 * exposes version data for IDs that do not exist.
 */
export async function test_api_discussionBoard_test_list_post_versions_for_nonexistent_post(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for a postId that is guaranteed not to exist
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();

  let result: IPageIDiscussionBoardPostVersion | null = null;
  let errorOccurred = false;

  try {
    // 2. Attempt to fetch post versions for the fake postId
    result = await api.functional.discussionBoard.member.posts.versions.index(
      connection,
      { postId: nonExistentPostId },
    );
    typia.assert(result);
  } catch {
    // 3a. If an error occurs, that's acceptable as a not-found/domain error
    errorOccurred = true;
  }

  // 3b. If no error, assert the result has no data (no versions returned)
  TestValidator.predicate("should error OR return no version data")(
    errorOccurred ||
      (result !== null &&
        Array.isArray(result.data) &&
        result.data.length === 0),
  );
}
