import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Validate that admin can update metadata of an attachment on any discussion
 * post.
 *
 * This test simulates a realistic editor/admin workflow:
 *
 * 1. A member creates a topic in a category
 * 2. The member creates a thread in the topic
 * 3. The member creates a post in the thread
 * 4. The member attaches a file to the post
 * 5. (Role switch) The admin updates the attachment's metadata (e.g., file_name,
 *    mime_type)
 * 6. The test confirms that all changes are reflected in the returned attachment,
 *    and the update succeeded
 */
export async function test_api_discussionBoard_test_update_post_attachment_metadata_as_admin_success(
  connection: api.IConnection,
) {
  // 1. Member creates a topic (assuming a category is required)
  const topic: IDiscussionBoardTopics =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    });
  typia.assert(topic);

  // 2. Member creates a thread in the topic
  const thread: IDiscussionBoardThreads =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(),
        },
      },
    );
  typia.assert(thread);

  // 3. Member creates a post in the thread
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.threads.posts.create(
      connection,
      {
        threadId: thread.id,
        body: {
          discussion_board_thread_id: thread.id,
          body: RandomGenerator.content()()(),
        },
      },
    );
  typia.assert(post);

  // 4. Member attaches a file to the post
  const attachment: IDiscussionBoardPostAttachment =
    await api.functional.discussionBoard.member.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          uploader_member_id: post.creator_member_id,
          file_uri: RandomGenerator.alphaNumeric(20),
          file_name: `initial_${RandomGenerator.alphabets(8)}.txt`,
          mime_type: "text/plain",
        },
      },
    );
  typia.assert(attachment);

  // 5. (Role switch to admin assumed by context, or connection is admin)
  // Attempt to update metadata such as file_name and mime_type
  const updatedFileName = `updated_${RandomGenerator.alphabets(8)}.md`;
  const updatedMimeType = "text/markdown";

  const updated: IDiscussionBoardPostAttachment =
    await api.functional.discussionBoard.admin.posts.attachments.update(
      connection,
      {
        postId: post.id,
        attachmentId: attachment.id,
        body: {
          file_name: updatedFileName,
          mime_type: updatedMimeType,
        },
      },
    );
  typia.assert(updated);

  // 6. Validate that returned attachment reflects the updates
  TestValidator.equals("Updated attachment filename")(updated.file_name)(
    updatedFileName,
  );
  TestValidator.equals("Updated attachment mime_type")(updated.mime_type)(
    updatedMimeType,
  );
  // Invariant fields remain unchanged
  TestValidator.equals("Post id remains")(updated.discussion_board_post_id)(
    attachment.discussion_board_post_id,
  );
  TestValidator.equals("Uploader member id remains")(
    updated.uploader_member_id,
  )(attachment.uploader_member_id);
  TestValidator.equals("File URI remains")(updated.file_uri)(
    attachment.file_uri,
  );
}
