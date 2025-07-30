import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validates that attempting to delete a discussion board post attachment using
 * a non-existent attachmentId fails with a not-found error.
 *
 * Business context: In collaborative discussion boards, posts may have file
 * attachments (handled by a separate attachment relation). For audit and
 * business integrity, attachment deletions must respect access, existence, and
 * referential consistency rules. This test ensures the API correctly handles
 * user attempts to remove a non-existent attachment, guarding against both
 * silent failures and unintentional side-effects on other data.
 *
 * Steps:
 *
 * 1. Create a discussion topic (providing a minimum viable category ref).
 * 2. Create a thread within the topic
 * 3. Create a post within the thread
 * 4. Attempt a DELETE on
 *    /discussionBoard/member/posts/{postId}/attachments/{nonexistentAttachmentId}:
 *    this must yield a not-found error (e.g., 404)
 * 5. (Optional) Verify that other attachments, if any, are unaffected (as we
 *    create no real attachments, presence of others is out of scope)
 */
export async function test_api_discussionBoard_test_delete_post_attachment_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Create a topic with minimal required data
  const topicCategoryId: string = typia.random<string & tags.Format<"uuid">>();
  const topicInput: IDiscussionBoardTopics.ICreate = {
    title: RandomGenerator.paragraph()(10),
    description: null,
    pinned: false,
    closed: false,
    discussion_board_category_id: topicCategoryId,
  };
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    { body: topicInput },
  );
  typia.assert(topic);

  // 2. Create a thread within the topic
  const threadInput: IDiscussionBoardThreads.ICreate = {
    title: RandomGenerator.paragraph()(10),
  };
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: threadInput,
      },
    );
  typia.assert(thread);

  // 3. Create a post in the thread
  const postInput: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: thread.id,
    body: RandomGenerator.paragraph()(30),
  };
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: postInput,
    },
  );
  typia.assert(post);

  // 4. Attempt to delete a non-existent attachment from the post
  const fakeAttachmentId: string = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw 404/not-found for nonexistent attachment",
  )(async () => {
    await api.functional.discussionBoard.member.posts.attachments.erase(
      connection,
      {
        postId: post.id,
        attachmentId: fakeAttachmentId,
      },
    );
  });

  // 5. (Optional) Could re-fetch post & check attachments if attachment list was available; skipped as out of scope.
}
