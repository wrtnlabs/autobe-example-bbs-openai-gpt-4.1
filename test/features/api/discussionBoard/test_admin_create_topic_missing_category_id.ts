import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate error handling when an admin tries to create a discussion topic
 * without providing a required category ID.
 *
 * This test ensures the API enforces required-field validation for
 * `discussion_board_category_id`, which is essential for topic integrity. It
 * tests that the endpoint returns an error when that field is omitted in
 * payload.
 *
 * Steps:
 *
 * 1. Compose a creation payload omitting the `discussion_board_category_id` (which
 *    is required by schema).
 * 2. Attempt to create an admin topic using this payload.
 * 3. Confirm that the API responds with a validation error for the missing
 *    category ID.
 */
export async function test_api_discussionBoard_test_admin_create_topic_missing_category_id(
  connection: api.IConnection,
) {
  // 1. Construct a payload missing the required category ID
  const invalidPayload = {
    title: "Validation test: topic missing categoryId",
    description: "Deliberately missing discussion_board_category_id field.",
    pinned: false,
    closed: false,
    // discussion_board_category_id intentionally omitted
  };

  // 2. Try creating a topic; must fail
  await TestValidator.error("should fail due to missing category ID")(
    async () => {
      // Purposefully bypass static typing for this negative test
      await api.functional.discussionBoard.admin.topics.create(connection, {
        body: invalidPayload,
      } as any);
    },
  );
}
