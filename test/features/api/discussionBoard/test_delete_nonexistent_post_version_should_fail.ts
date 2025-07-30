import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate that attempting to delete a non-existent post version as an admin
 * results in a not found error (and nothing is deleted).
 *
 * Business context: Admins are empowered to hard-delete historical versions of
 * posts on the discussion board. However, API integrity requires that
 * attempting to delete a version record that does not exist (using random UUIDs
 * for both postId and versionId) results in a clear not found error, not a
 * silent succeed or any unrelated error. This ensures deletion endpoints do not
 * allow accidental or malicious data erasure of unrelated records and surface
 * clear diagnostics for HTTP 404 situations.
 *
 * Test Steps:
 *
 * 1. Create an admin member (to obtain permissions for delete operation)
 * 2. Try to delete a post version using random (non-existent) UUIDs for both
 *    postId and versionId
 * 3. Assert that the erase API call fails with a not found error, confirming no
 *    side effects or privilege errors occur
 */
export async function test_api_discussionBoard_test_delete_nonexistent_post_version_should_fail(
  connection: api.IConnection,
) {
  // 1. Register a new admin member for permission to delete
  const admin = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: typia.random<string>(),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(admin);

  // 2. Attempt to delete a non-existent post version (random UUIDs)
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  const randomVersionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Assert the erase call throws a not found error (typically 404)
  await TestValidator.error(
    "should throw not found error when deleting non-existent post version",
  )(async () => {
    await api.functional.discussionBoard.admin.posts.versions.erase(
      connection,
      {
        postId: randomPostId,
        versionId: randomVersionId,
      },
    );
  });
}
