import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Test that a moderator can update the metadata of an existing post attachment
 * for any user's post.
 *
 * This test ensures that moderators can successfully update post attachment
 * metadata (such as filename or file URI) for attachments uploaded by any
 * member. The end-to-end flow includes:
 *
 * 1. Creating a topic as a member
 * 2. Creating a thread in the topic as a member
 * 3. Creating a post in the thread as a member
 * 4. Uploading an attachment to the post as a member
 * 5. Updating the attachment metadata as a moderator
 * 6. Verifying that the updated metadata is reflected in the API response and that
 *    immutable fields are unchanged
 *
 * All API responses are asserted for type and logic. The update step changes at
 * least one field and verifies the update via value comparison.
 */
export async function test_api_discussionBoard_test_update_post_attachment_metadata_as_moderator_success(
  connection: api.IConnection,
) {
  // 1. Create a topic as a member
  const topicCategoryId = typia.random<string & tags.Format<"uuid">>(); // assuming random valid category
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.paragraph()(1),
        pinned: false,
        closed: false,
        discussion_board_category_id: topicCategoryId,
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
          title: RandomGenerator.paragraph()(1),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 3. Create a post in that thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.content()(1)(1),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Upload an attachment as a member
  const uploaderId = typia.random<string & tags.Format<"uuid">>(); // assuming random valid member
  const originalAttachment =
    await api.functional.discussionBoard.member.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          uploader_member_id: uploaderId,
          file_uri: "https://cdn.example.com/testfile-original.pdf",
          file_name: "original-file-name.pdf",
          mime_type: "application/pdf",
        } satisfies IDiscussionBoardPostAttachment.ICreate,
      },
    );
  typia.assert(originalAttachment);

  // Store pre-update values for later comparison
  const preUpdateFileName = originalAttachment.file_name;
  const preUpdateFileUri = originalAttachment.file_uri;
  const preUpdateMimeType = originalAttachment.mime_type;

  // 5. Update the attachment metadata as a moderator
  // (assume connection has moderator role for this step)
  const updateInput: IDiscussionBoardPostAttachment.IUpdate = {
    file_name: "updated-file-name.pdf",
    file_uri: "https://cdn.example.com/testfile-updated.pdf",
    mime_type: "application/msword",
  };
  const updatedAttachment =
    await api.functional.discussionBoard.moderator.posts.attachments.update(
      connection,
      {
        postId: post.id,
        attachmentId: originalAttachment.id,
        body: updateInput,
      },
    );
  typia.assert(updatedAttachment);

  // 6. Validation: Confirm that the update was successful
  // a. The updated fields reflect new input
  TestValidator.equals("file_name updated")(updatedAttachment.file_name)(
    updateInput.file_name,
  );
  TestValidator.equals("file_uri updated")(updatedAttachment.file_uri)(
    updateInput.file_uri,
  );
  TestValidator.equals("mime_type updated")(updatedAttachment.mime_type)(
    updateInput.mime_type,
  );
  // b. Immutable fields remain unchanged
  TestValidator.equals("attachment id unchanged")(updatedAttachment.id)(
    originalAttachment.id,
  );
  TestValidator.equals("post id unchanged")(
    updatedAttachment.discussion_board_post_id,
  )(originalAttachment.discussion_board_post_id);
  TestValidator.equals("uploader remains the same")(
    updatedAttachment.uploader_member_id,
  )(originalAttachment.uploader_member_id);
  // c. Uploaded_at timestamp remains unchanged (metadata update only)
  TestValidator.equals("uploaded_at unchanged")(updatedAttachment.uploaded_at)(
    originalAttachment.uploaded_at,
  );
}
