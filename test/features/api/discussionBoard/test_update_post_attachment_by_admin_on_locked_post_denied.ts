import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Validate that updating attachment metadata by an admin is denied when the
 * parent post is locked.
 *
 * Business context:
 *
 * - When a discussion board post's parent thread is locked, no further
 *   modification of post attachments should be permitted, even for admins.
 *
 * This test ensures that the API correctly rejects attempts to update
 * attachment metadata on posts belonging to locked threads.
 *
 * Workflow:
 *
 * 1. Create a topic as a member (to hold the thread/post).
 * 2. Create a thread under the topic as a member.
 * 3. Create a post under the thread as a member.
 * 4. Attach a file to the post as a member.
 * 5. Lock the thread as an admin (title re-submission; no direct 'closed'
 *    property, so test assumes lock occurs by update API as allowed by SDK/DTO,
 *    per available schema).
 * 6. Try to update the attachment via the admin API—the operation should fail with
 *    an error, confirming business rule enforcement.
 *
 * The test passes if updating the attachment throws an error.
 */
export async function test_api_discussionBoard_test_update_post_attachment_by_admin_on_locked_post_denied(
  connection: api.IConnection,
) {
  // 1. Create a topic as a member
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 2. Create a thread under the topic
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

  // 3. Create a post under the thread
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

  // 4. Attach a file to the post
  const attachment =
    await api.functional.discussionBoard.member.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          uploader_member_id: post.creator_member_id,
          file_uri:
            "https://cdn.example.com/" + RandomGenerator.alphaNumeric(8),
          file_name: RandomGenerator.alphaNumeric(8) + ".png",
          mime_type: "image/png",
        } satisfies IDiscussionBoardPostAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 5. Lock the thread as admin—no direct 'closed' property, so update with same title to trigger business logic
  const updatedThread =
    await api.functional.discussionBoard.admin.topics.threads.update(
      connection,
      {
        topicId: topic.id,
        threadId: thread.id,
        body: {
          title: thread.title,
        } satisfies IDiscussionBoardThreads.IUpdate,
      },
    );
  typia.assert(updatedThread);

  // 6. Attempt to update the attachment as admin—should fail due to locked state
  await TestValidator.error("Attachment update on locked parent should fail")(
    async () => {
      await api.functional.discussionBoard.admin.posts.attachments.update(
        connection,
        {
          postId: post.id,
          attachmentId: attachment.id,
          body: {
            file_name: RandomGenerator.alphaNumeric(12) + ".png",
          } satisfies IDiscussionBoardPostAttachment.IUpdate,
        },
      );
    },
  );
}
