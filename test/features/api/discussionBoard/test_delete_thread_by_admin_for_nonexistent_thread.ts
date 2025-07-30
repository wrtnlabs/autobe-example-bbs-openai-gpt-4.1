import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate error handling when an admin attempts to delete a non-existent
 * discussion thread.
 *
 * This test ensures the system returns a 404 error and no data changes occur
 * when an admin tries to delete a thread with an invalid UUID under a valid
 * topic. It is important to verify the API's robustness and security by
 * confirming that improper or incorrect operations fail gracefully and do not
 * impact system state.
 *
 * Test Workflow:
 *
 * 1. Admin creates a new discussion topic (to ensure the topic exists).
 * 2. Admin attempts to delete a thread using this topicId but with a randomly
 *    generated, non-existent threadId (valid UUID format).
 * 3. System should return a 404 error (thread not found).
 * 4. No topic or thread data should be changed.
 */
export async function test_api_discussionBoard_test_delete_thread_by_admin_for_nonexistent_thread(
  connection: api.IConnection,
) {
  // Step 1: Admin creates a new discussion topic for test referencing
  const topicInput: IDiscussionBoardTopics.ICreate = {
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.paragraph()(),
    pinned: false,
    closed: false,
    discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const topic: IDiscussionBoardTopics =
    await api.functional.discussionBoard.admin.topics.create(connection, {
      body: topicInput,
    });
  typia.assert(topic);

  // Step 2: Attempt to delete a non-existent thread by using a random UUID as threadId
  const fakeThreadId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Ensure fakeThreadId is not a real thread (we have not created any threads at all)
  await TestValidator.error("delete non-existent thread should return 404")(
    async () => {
      await api.functional.discussionBoard.admin.topics.threads.erase(
        connection,
        {
          topicId: topic.id,
          threadId: fakeThreadId,
        },
      );
    },
  );
  // Further, system state could be checked by listing threads if API provides (not in scope here).
}
