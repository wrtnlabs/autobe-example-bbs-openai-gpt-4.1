import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate that requesting topic details for a nonexistent topic returns the
 * correct error.
 *
 * Business context: API consumers may query topics by ID, and the API must
 * robustly handle requests for nonexistent records. Proper error signaling
 * (e.g., 404 not found) upholds client reliability and clear communication.
 *
 * Steps:
 *
 * 1. Generate a random UUID that does not correspond to any existing topic
 * 2. Attempt to fetch topic details using this UUID
 * 3. Verify that the API call fails with an error (ideally 404), confirming proper
 *    handling of missing resources
 */
export async function test_api_discussionBoard_test_fetch_topic_details_nonexistent_topic(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID that does not correspond to any existing topic
  const nonexistentTopicId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to fetch topic details for nonexistent topic
  await TestValidator.error(
    "should return not found error for nonexistent topic",
  )(async () => {
    await api.functional.discussionBoard.topics.at(connection, {
      topicId: nonexistentTopicId,
    });
  });
}
