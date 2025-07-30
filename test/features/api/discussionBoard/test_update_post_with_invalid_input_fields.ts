import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Test updating a discussion board post with invalid inputs
 *
 * This E2E verifies that updates to posts with invalid data—such as an empty or
 * excessively long body, or attempts to modify non-editable fields—are properly
 * rejected, and that the post remains unchanged after failed attempts.
 *
 * 1. Provision a new discussion board member (for authentication context)
 * 2. Create a discussion topic for posting
 * 3. Create a thread for the topic
 * 4. Create a post within the thread
 * 5. Attempt to update the post with an empty body (should fail)
 * 6. Attempt to update the post with an excessively long body (should fail)
 * 7. Attempt to update restricted/non-editable field (e.g. creator_member_id, not
 *    possible with current schema — skip)
 * 8. Verify the post remains unchanged by reading the original post
 */
export async function test_api_discussionBoard_test_update_post_with_invalid_input_fields(
  connection: api.IConnection,
) {
  // Step 1: Create a board member (admin creates member)
  const newMember = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphabets(10),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(newMember);

  // Step 2: Create a topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // Step 3: Create a thread
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(1),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // Step 4: Create a post
  const originalBody = RandomGenerator.paragraph()();
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: originalBody,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Attempt update with empty body
  await TestValidator.error("update with empty body fails")(() =>
    api.functional.discussionBoard.member.threads.posts.update(connection, {
      threadId: thread.id,
      postId: post.id,
      body: {
        body: "",
      } satisfies IDiscussionBoardPost.IUpdate,
    }),
  );

  // Step 6: Attempt update with excessively long body
  const tooLongBody = "A".repeat(16384);
  await TestValidator.error("update with excessively long body fails")(() =>
    api.functional.discussionBoard.member.threads.posts.update(connection, {
      threadId: thread.id,
      postId: post.id,
      body: {
        body: tooLongBody,
      } satisfies IDiscussionBoardPost.IUpdate,
    }),
  );

  // Step 7: Attempt to update non-editable field -- cannot do so (schema restriction), so test is implicit for type safety

  // Step 8: Verify the post remains unchanged by directly reading the post (No GET endpoint to re-read, so skipped)
  // If a GET-by-id were available, would re-fetch post and verify body matches originalBody here
}
