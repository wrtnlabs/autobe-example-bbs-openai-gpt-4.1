import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Validate the 404 not found behavior when updating a discussion board category by a non-existent or deleted ID.
 *
 * This test ensures that only existing and active categories can be updated. If the client attempts to update a category
 * whose ID does not exist (including already-deleted/soft-deleted ones), the API MUST return a 404 error. This is crucial for
 * data integrity and proper user feedback.
 *
 * Step-by-step process:
 * 1. Generate a random UUID (that is not associated with any existing category in the test database).
 * 2. Prepare an update payload (with any valid fields, e.g., name, description).
 * 3. Attempt to update the category at /discussionBoard/categories/{id} using the random (non-existent) ID.
 * 4. Assert that the API throws an error (404 Not Found). No category should be updated or created.
 * 5. (Optional/not implemented) Repeat the same update with another UUID simulating a soft-deleted category (if such a flow can be arranged, else skip).
 */
export async function test_api_discussionBoard_test_update_category_with_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID not tied to any real category
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  // 2. Prepare a valid update payload
  const updateBody = {
    name: "ShouldNeverAppear",
    description: "Testing update on a missing category should fail."
  } satisfies IDiscussionBoardCategory.IUpdate;

  // 3. Attempt update with random non-existent category ID
  await TestValidator.error("404 not found error for non-existent category")(
    async () => {
      await api.functional.discussionBoard.categories.putById(connection, {
        id: fakeId,
        body: updateBody,
      });
    },
  );

  // 5. (Optional) If simulating soft-deleted category is possible, repeat with a soft-deleted ID
  // Not implemented here due to scenario constraints and absence of setup API.
}