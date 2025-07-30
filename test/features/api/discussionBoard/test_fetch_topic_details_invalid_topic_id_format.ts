import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate API handling of invalid topicId format when fetching topic details
 *
 * This test verifies that the /discussionBoard/topics/{topicId} endpoint
 * properly rejects requests where topicId is not a valid UUID string. The
 * endpoint requires the path parameter to be a valid UUID, so passing an
 * obviously invalid string should cause a validation error (typically a 400 Bad
 * Request).
 *
 * This ensures that the API does not accidentally leak discussion topic data or
 * process requests improperly when receiving malformed input.
 *
 * Steps:
 *
 * 1. Construct a clearly invalid topicId string (e.g., "not-a-uuid").
 * 2. Call api.functional.discussionBoard.topics.at, forcibly passing this as the
 *    UUID value.
 * 3. Assert that the API throws an error in response.
 * 4. Confirm that no topic data is returned on invalid input.
 */
export async function test_api_discussionBoard_test_fetch_topic_details_invalid_topic_id_format(
  connection: api.IConnection,
) {
  // 1. Create an invalid string that is certainly not a UUID
  const invalidTopicId = "not-a-uuid";

  // 2. Attempt to fetch topic details using the invalid topicId, expecting an error
  await TestValidator.error("API rejects invalid topicId format")(async () => {
    await api.functional.discussionBoard.topics.at(connection, {
      topicId: invalidTopicId as unknown as string & tags.Format<"uuid">,
    });
  });
}
