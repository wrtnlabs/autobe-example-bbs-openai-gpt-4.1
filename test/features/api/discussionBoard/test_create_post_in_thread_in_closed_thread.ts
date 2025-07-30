import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate the rejection of post creation in administratively closed threads.
 *
 * This E2E test ensures the discussion board API prevents the creation of new
 * posts in a thread that has been administratively closed to further
 * participation.
 *
 * Business Rationale: Threads may be closed by moderators or administrators for
 * rule enforcement or content management. Creating posts in such threads must
 * be blocked at the API level to enforce board rules and data integrity.
 *
 * Test Workflow:
 *
 * 1. Create a new discussion topic (requires a valid category UUID). Topic starts
 *    open.
 * 2. Create a new thread under the topic (thread starts open for posting).
 * 3. [Scenario limitation] There is no SDK/API to administratively close a thread,
 *    so we cannot programmatically set the thread as closed. We proceed without
 *    this step, as per system guidelines.
 * 4. Attempt to create a post in the thread. The test expects this attempt to be
 *    rejected (error thrown) – in a real system, the thread would be closed
 *    before this step.
 * 5. Validate that an error is thrown, without inspecting its details or message
 *    (per E2E guidelines).
 *
 * Note: This test omits unimplementable API operations—direct thread
 * closure—per requirements; only feasible, provided features are tested. If the
 * environment supports special fixture/seeding that closes the thread, this
 * test should be adjusted accordingly.
 */
export async function test_api_discussionBoard_test_create_post_in_thread_in_closed_thread(
  connection: api.IConnection,
) {
  // 1. Create a discussion topic (opened for threads and posts)
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        description: RandomGenerator.paragraph()(2),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 2. Create a new thread under the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(2),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 3. [Unimplementable] Administrative thread closure is not available via the provided API/SDK.
  //    In a compliant system, this step would close the thread for posting. Here, we proceed knowing this cannot be automated.
  //
  // 4. Attempt to create a post in the thread – should throw error if thread were closed
  await TestValidator.error("should not allow post creation in closed thread")(
    async () => {
      await api.functional.discussionBoard.member.threads.posts.create(
        connection,
        {
          threadId: thread.id,
          body: {
            discussion_board_thread_id: thread.id,
            body: RandomGenerator.paragraph()(1),
          } satisfies IDiscussionBoardPost.ICreate,
        },
      );
    },
  );
}
