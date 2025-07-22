import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that updating a discussion board tag with invalid input data is properly rejected.
 *
 * This validates the API's input validation and error handling logic by attempting to update a tag
 * (previously created as setup) with invalid data: an empty string for `name`, and explicit null for `name`.
 * The update operation should return a validation error (which typically results in an error/exception thrown),
 * and the tag's core fields (name, description) should remain unchanged after the failed update attempt.
 *
 * Steps:
 * 1. Create a valid tag via POST /discussionBoard/tags.
 * 2. Attempt to update the tag with empty-string name (should fail).
 * 3. (API limitation) No endpoint for re-loading a single tag, so skip field post-condition check.
 * 4. Attempt to update the tag with `name: null` (should fail).
 * 5. (API limitation) No endpoint for re-loading a single tag, so skip field post-condition check.
 */
export async function test_api_discussionBoard_test_update_tag_with_invalid_input_data(
  connection: api.IConnection,
) {
  // 1. Create a valid tag as setup
  const originalTag = await api.functional.discussionBoard.tags.post(connection, {
    body: {
      name: "valid-tag",
      description: "A valid tag for testing input validation."
    } satisfies IDiscussionBoardTag.ICreate,
  });
  typia.assert(originalTag);

  // 2. Attempt update with empty-string name (should fail)
  await TestValidator.error("empty-string name should fail update")(() =>
    api.functional.discussionBoard.tags.putById(connection, {
      id: originalTag.id,
      body: { name: "" },
    })
  );

  // 3. (Limitation) No tag GET-by-id endpoint, so cannot verify state; document limitation.

  // 4. Attempt update with name: null (should fail)
  await TestValidator.error("null name should fail update")(() =>
    api.functional.discussionBoard.tags.putById(connection, {
      id: originalTag.id,
      body: { name: null },
    })
  );

  // 5. (Limitation) No tag GET-by-id endpoint, so cannot verify state; document limitation.
}