import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Validate rejection of attempts to update immutable post attachment fields by
 * admin.
 *
 * Business context:
 *
 * - Only a subset of fields (file_name, file_uri, mime_type) are mutable for post
 *   attachments.
 * - Fields such as uploaded_at are not modifiable, and uploader_member_id should
 *   generally remain immutable except for rare system audit scenarios (even if
 *   present schema-wise, business rules must enforce immutability by default).
 *
 * Test steps:
 *
 * 1. Create a topic as a member for setup.
 * 2. Create a thread in that topic as a member.
 * 3. Create a post in that thread as a member.
 * 4. Add an attachment to the post as a member (to get a valid attachmentId).
 * 5. As admin, attempt to update immutable fields (uploader_member_id):
 *
 *    - Try to change uploader_member_id.
 *    - Expect error (validation or rejection) because this field must not be
 *         updatable by standard admin operations.
 * 6. Assert that valid mutable fields (file_name, file_uri, mime_type) can be
 *    updated successfully and changes are reflected.
 */
export async function test_api_discussionBoard_test_update_post_attachment_with_invalid_fields_as_admin(
  connection: api.IConnection,
) {
  // 1. Create a topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphaNumeric(12),
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

  // 2. Create a thread in that topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.alphaNumeric(10),
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

  // 4. Add an attachment to the post
  const attachment =
    await api.functional.discussionBoard.member.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          uploader_member_id: typia.random<string & tags.Format<"uuid">>(),
          file_uri: "https://example.com/hello.pdf",
          file_name: "hello.pdf",
          mime_type: "application/pdf",
        },
      },
    );
  typia.assert(attachment);

  // 5. As admin, attempt to update immutable field (uploader_member_id)
  await TestValidator.error(
    "Should reject update to immutable 'uploader_member_id'",
  )(() =>
    api.functional.discussionBoard.admin.posts.attachments.update(connection, {
      postId: post.id,
      attachmentId: attachment.id,
      body: {
        uploader_member_id: typia.random<string & tags.Format<"uuid">>(),
      },
    }),
  );

  // 6. Update allowed mutable fields
  const updated =
    await api.functional.discussionBoard.admin.posts.attachments.update(
      connection,
      {
        postId: post.id,
        attachmentId: attachment.id,
        body: {
          file_name: "hello-updated.pdf",
          file_uri: "https://example.com/hello-upd.pdf",
          mime_type: "application/pdf",
        },
      },
    );
  typia.assert(updated);
  TestValidator.equals("file_name updated")(updated.file_name)(
    "hello-updated.pdf",
  );
  TestValidator.equals("file_uri updated")(updated.file_uri)(
    "https://example.com/hello-upd.pdf",
  );
  TestValidator.equals("mime_type updated")(updated.mime_type)(
    "application/pdf",
  );
}
