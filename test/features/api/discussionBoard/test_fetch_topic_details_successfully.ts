import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate fetching topic details by topicId returns accurate information
 *
 * This test ensures that when a topic is created via POST
 * /discussionBoard/member/topics, it is possible to retrieve that topic's
 * detailed information using GET /discussionBoard/topics/{topicId}.
 *
 * Test Steps:
 *
 * 1. Create a valid topic with random values for all required fields
 * 2. Use the returned topicId to fetch the topic details
 * 3. Assert that the fetched topic matches the created topic (title, description,
 *    state flags, category, etc.)
 * 4. Assert type compliance of the returned data structure
 */
export async function test_api_discussionBoard_test_fetch_topic_details_successfully(
  connection: api.IConnection,
) {
  // 1. Create a topic to obtain a valid topicId
  const createInput: IDiscussionBoardTopics.ICreate = {
    title: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph()(),
    pinned: false,
    closed: false,
    discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const createdTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: createInput,
    });
  typia.assert(createdTopic);

  // 2. Fetch topic by ID
  const fetchedTopic = await api.functional.discussionBoard.topics.at(
    connection,
    { topicId: createdTopic.id },
  );
  typia.assert(fetchedTopic);

  // 3. Assert that all fields match (excluding generated fields like created_at/updated_at/IDs)
  TestValidator.equals("topic title matches")(fetchedTopic.title)(
    createInput.title,
  );
  TestValidator.equals("topic description matches")(fetchedTopic.description)(
    createInput.description ?? null,
  );
  TestValidator.equals("pinned flag matches")(fetchedTopic.pinned)(
    createInput.pinned,
  );
  TestValidator.equals("closed flag matches")(fetchedTopic.closed)(
    createInput.closed,
  );
  TestValidator.equals("category id matches")(
    fetchedTopic.discussion_board_category_id,
  )(createInput.discussion_board_category_id);
  TestValidator.equals("topic id same as creation")(fetchedTopic.id)(
    createdTopic.id,
  );
}
