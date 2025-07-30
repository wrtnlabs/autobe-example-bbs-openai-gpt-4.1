import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Validate that a member (attachment owner) can successfully delete their own
 * attachment from their post.
 *
 * This test ensures that the file upload/delete APIs for post attachments work
 * as intended. It covers the following workflow:
 *
 * 1. Create a topic as a prerequisite for post creation.
 * 2. Create a thread within the topic.
 * 3. Create a post in that thread as a member.
 * 4. Upload an attachment to the post as its owner.
 * 5. Delete the attachment as the owner (member).
 * 6. Attempt to delete the same attachment again to confirm it is no longer
 *    present (should fail).
 */
export async function test_api_discussionBoard_test_delete_own_post_attachment_success(
  connection: api.IConnection,
) {
  // 1. Create a topic (member)
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphabets(16),
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 2. Create a thread within the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.alphabets(16),
        },
      },
    );
  typia.assert(thread);

  // 3. Create a post in the thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.paragraph()(),
      },
    },
  );
  typia.assert(post);

  // 4. Upload an attachment to the post (as owner)
  const attachment =
    await api.functional.discussionBoard.member.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          uploader_member_id: post.creator_member_id,
          file_uri: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}`,
          file_name: `${RandomGenerator.alphabets(8)}.txt`,
          mime_type: "text/plain",
        },
      },
    );
  typia.assert(attachment);
  TestValidator.equals("attachment post id")(
    attachment.discussion_board_post_id,
  )(post.id);
  TestValidator.equals("attachment uploader")(attachment.uploader_member_id)(
    post.creator_member_id,
  );

  // 5. Delete the attachment as the owner
  await api.functional.discussionBoard.member.posts.attachments.erase(
    connection,
    {
      postId: post.id,
      attachmentId: attachment.id,
    },
  );

  // 6. Attempt to delete the same attachment again to confirm it is gone (should fail)
  await TestValidator.error(
    "attachment is deleted and cannot be deleted again",
  )(async () => {
    await api.functional.discussionBoard.member.posts.attachments.erase(
      connection,
      {
        postId: post.id,
        attachmentId: attachment.id,
      },
    );
  });
}
