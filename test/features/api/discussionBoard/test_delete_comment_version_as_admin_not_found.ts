import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate error handling for deleting a comment version as admin when using
 * not found IDs.
 *
 * This test ensures that when the admin user attempts to delete a comment
 * version using an invalid (non-existent) commentId or versionId, the API
 * responds with a 'not found' error (typically HTTP 404), confirming correct
 * handling of references to non-existent comment or version records.
 *
 * Step-by-step process:
 *
 * 1. Generate two sets of random UUIDs (commentId, versionId) that are extremely
 *    unlikely to actually exist in the DB.
 * 2. Attempt to call the admin delete comment version API with those IDs.
 * 3. Assert that the API throws an error (HttpError) indicating the record was not
 *    found.
 */
export async function test_api_discussionBoard_test_delete_comment_version_as_admin_not_found(
  connection: api.IConnection,
) {
  // Step 1: Generate random UUIDs that should not match any real comment/version
  const invalidCommentId = typia.random<string & tags.Format<"uuid">>();
  const invalidVersionId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Attempt to delete and verify error is thrown
  await TestValidator.error("Deleting with non-existent IDs returns not found")(
    async () => {
      await api.functional.discussionBoard.admin.comments.versions.erase(
        connection,
        { commentId: invalidCommentId, versionId: invalidVersionId },
      );
    },
  );
}
