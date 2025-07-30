import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVersion";

/**
 * Attempt fetching a version snapshot for a non-existent post or non-existent
 * version
 *
 * This test verifies the error handling of the GET
 * /discussionBoard/member/posts/{postId}/versions/{versionId} endpoint when
 * either the postId or versionId does not correspond to an existing record in
 * the database. No version data should be exposed, and a precise not-found
 * error is expected.
 *
 * Steps:
 *
 * 1. Generate random UUIDs for postId and versionId that almost certainly do not
 *    exist in the system.
 * 2. Attempt to fetch with both random postId and versionId (total-garbage
 *    reference).
 * 3. Validate that the call fails with a not-found error (returns error, does not
 *    expose version data).
 * 4. Optionally, attempt with plausible postId but random/nonexistent versionId
 *    (if scenario allowed), but no legitimate post/version creation functions
 *    are available, so both must be random.
 */
export async function test_api_discussionBoard_test_fetch_nonexistent_post_version(
  connection: api.IConnection,
) {
  // 1. Generate random postId and versionId (UUIDs that are extremely unlikely to exist)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const versionId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to fetch a post version with these IDs; expect a not-found error
  await TestValidator.error("not found error for nonexistent post/version")(
    async () => {
      await api.functional.discussionBoard.member.posts.versions.at(
        connection,
        {
          postId,
          versionId,
        },
      );
    },
  );
}
