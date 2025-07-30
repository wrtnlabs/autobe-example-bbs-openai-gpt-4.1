import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Test the moderator's behavior when attempting to delete a non-existent
 * attachment from a valid post.
 *
 * This verifies two things:
 *
 * 1. That the appropriate 'not found' error is raised when attempting to delete an
 *    attachment via DELETE
 *    /discussionBoard/moderator/posts/{postId}/attachments/{attachmentId} where
 *    the attachmentId does not exist.
 * 2. That no side effect occurs (i.e., deleting with a fake attachment does not
 *    affect a valid post's normal state).
 *
 * Steps:
 *
 * 1. Create a discussion topic as a member (prerequisite for post)
 * 2. Create a thread within this topic
 * 3. Create a post within the thread
 * 4. As moderator, call the erase API with the created post's ID, but a random
 *    attachmentId (ensure this attachmentId doesn't exist)
 * 5. Assert that a not-found error is thrown
 * 6. Optionally, re-fetch or use side effect checks to confirm the post has not
 *    been affected
 */
export async function test_api_discussionBoard_test_delete_nonexistent_post_attachment_as_moderator(
  connection: api.IConnection,
) {
  // 1. Create a topic as a member
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 2. Create a thread in this topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 3. Create a post in this thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.content()()(),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Try to delete a non-existent attachment as moderator
  const fakeAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return not-found on non-existent attachment",
  )(() =>
    api.functional.discussionBoard.moderator.posts.attachments.erase(
      connection,
      {
        postId: post.id,
        attachmentId: fakeAttachmentId,
      },
    ),
  );

  // 5. (Optional) Check post still exists and is unchanged
  // (No GET API for post provided in available SDKs, so can't re-check in this context)
}
