import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Verify that requesting details for a non-existent discussion board tag returns a not found error.
 *
 * Business context:
 * Tags categorize threads/posts, and each has a unique UUID. Attempting to fetch a tag by a UUID that does not exist (not assigned to any tag, not soft-deleted) must return an error (typically 404 not found), confirming the system does not expose deleted/non-existent resources to users.
 *
 * Test steps:
 * 1. Generate a random UUID that is extremely unlikely to exist as a tag in the system.
 * 2. Attempt to retrieve the tag details using this UUID with api.functional.discussionBoard.tags.getById().
 * 3. Confirm that the call throws an error (e.g., not found).
 *
 * This test ensures that deleted/non-existent tags are inaccessible and verifies that the tag endpoint is robust against invalid ID lookups.
 */
export async function test_api_discussionBoard_test_get_tag_details_by_nonexistent_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for tag lookup
  const nonexistentTagId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();

  // 2. Try to fetch tag details with this UUID, expecting an error (not found)
  await TestValidator.error("should return not found for non-existent tag")(
    async () => {
      await api.functional.discussionBoard.tags.getById(connection, {
        id: nonexistentTagId,
      });
    }
  );
}