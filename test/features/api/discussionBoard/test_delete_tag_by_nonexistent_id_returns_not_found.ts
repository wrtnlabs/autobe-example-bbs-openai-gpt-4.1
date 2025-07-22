import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test deletion of a tag with a non-existent ID.
 *
 * This test ensures that attempting to delete a tag using an arbitrary UUID (not linked to any existing tag)
 * correctly returns a not found error and does not inadvertently affect the state of any tags in the system.
 *
 * Steps:
 * 1. Generate a random UUID that is not associated with any tag.
 * 2. Attempt to delete the tag using the API function.
 * 3. Assert that a not found error (typically 404) is thrown.
 *
 * Note: This test only validates that an error is thrown, as further state validation (tag count) requires listing functionality not provided by the current API.
 */
export async function test_api_discussionBoard_test_delete_tag_by_nonexistent_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID not associated with any tag
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to delete using the eraseById API
  await TestValidator.error("Should throw an error for non-existent tag ID")(async () => {
    await api.functional.discussionBoard.tags.eraseById(connection, {
      id: nonExistentTagId,
    });
  });
}