import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostVersion";

/**
 * Ensure version search on a non-existent post in discussion board fails.
 *
 * This test verifies that attempt to search version history for a postId not
 * present in the database returns a not-found (404) error and no version data.
 *
 * Steps:
 *
 * 1. Generate a random, guaranteed-nonexistent postId (UUID).
 * 2. Perform PATCH to the version search endpoint with this postId and an empty
 *    request body (all filters optional).
 * 3. Assert that a HttpError is thrown, and its status is 404 (resource not
 *    found).
 * 4. Confirm that no data is exposed in this process.
 */
export async function test_api_discussionBoard_test_search_post_versions_on_nonexistent_post(
  connection: api.IConnection,
) {
  // 1. Generate a random fake postId (guaranteed nonexistent)
  const fakePostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Patch request for version history with this postId and empty body
  await TestValidator.error(
    "not found error for nonexistent post version search;",
  )(async () => {
    await api.functional.discussionBoard.member.posts.versions.search(
      connection,
      {
        postId: fakePostId,
        body: {}, // all filters optional, sends empty filter body
      },
    );
  });
}
