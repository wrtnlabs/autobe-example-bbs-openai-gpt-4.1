import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate API error responses when required fields are missing for topic
 * creation.
 *
 * This test ensures that submitting a topic creation request with missing
 * mandatory fields (title or discussion_board_category_id) results in
 * appropriate validation errors. Both fields are required by the API and must
 * trigger separate error conditions if omitted.
 *
 * Steps:
 *
 * 1. Try to create a topic without a title (should fail with validation error)
 * 2. Try to create a topic without a category ID (should fail with validation
 *    error)
 * 3. Try omitting both at once and validate both errors are reported.
 */
export async function test_api_discussionBoard_test_create_topic_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Attempt to create a topic with missing title
  await TestValidator.error("missing title triggers validation")(async () => {
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        // title intentionally omitted
        // Valid value for category id
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        pinned: false,
        closed: false,
      } as any,
    });
  });

  // 2. Attempt to create a topic with missing category id
  await TestValidator.error("missing category triggers validation")(
    async () => {
      await api.functional.discussionBoard.member.topics.create(connection, {
        body: {
          title: "Missing Category Test",
          pinned: false,
          closed: false,
        } as any,
      });
    },
  );

  // 3. Attempt to create a topic with both required fields missing
  await TestValidator.error("missing title and category triggers validation")(
    async () => {
      await api.functional.discussionBoard.member.topics.create(connection, {
        body: {
          pinned: false,
          closed: false,
        } as any,
      });
    },
  );
}
