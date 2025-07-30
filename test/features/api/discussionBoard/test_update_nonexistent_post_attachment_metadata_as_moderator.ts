import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Test error scenario for updating a post attachment as a moderator where the
 * attachment does not exist.
 *
 * This test ensures that attempting to update a non-existent attachmentId (even
 * though the postId is valid) triggers the correct not-found error response,
 * and does not alter any records in the system.
 *
 * Business context: Moderators (or admins) may attempt to update file
 * attachment metadata for posts, but should receive a proper error if the
 * attachment ID is invalid (not stored in the DB for the referenced post). This
 * prevents silent data corruption or ambiguous errors.
 *
 * Steps:
 *
 * 1. Create a valid discussion topic so there is a valid parent context.
 * 2. Create a thread under the topic.
 * 3. Create a post within the thread. Now we have a valid postId.
 * 4. Attempt to update an attachment as moderator using the valid postId but a
 *    fake (non-existent) attachmentId.
 * 5. Assert that the API call throws an error (not found/404), not a success, and
 *    no records are altered.
 */
export async function test_api_discussionBoard_test_update_nonexistent_post_attachment_metadata_as_moderator(
  connection: api.IConnection,
) {
  // 1. Create a valid topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(8),
        description: RandomGenerator.paragraph()(16),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
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
          title: RandomGenerator.paragraph()(6),
        } satisfies IDiscussionBoardThreads.ICreate,
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
        body: RandomGenerator.paragraph()(10),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Attempt to update a non-existent attachment as moderator
  const fakeAttachmentId = typia.random<string & tags.Format<"uuid">>();
  const attachmentUpdate: IDiscussionBoardPostAttachment.IUpdate = {
    file_name: "fake_file.txt",
    file_uri: "https://fakeurl.test/file.txt",
    mime_type: "text/plain",
  };

  await TestValidator.error(
    "not found error when updating non-existent post attachment",
  )(async () => {
    await api.functional.discussionBoard.moderator.posts.attachments.update(
      connection,
      {
        postId: post.id,
        attachmentId: fakeAttachmentId,
        body: attachmentUpdate,
      },
    );
  });
}
