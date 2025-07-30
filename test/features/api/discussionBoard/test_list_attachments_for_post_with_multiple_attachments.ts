import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Validate listing attachments for a post with multiple attachments.
 *
 * Ensures that when a post in a thread has several uploaded attachments, the
 * API correctly returns all file records with accurate metadata.
 *
 * Steps:
 *
 * 1. Prepare a simulated thread ID (since thread create API is not available)
 * 2. Create a post within the thread as a member context
 * 3. Upload two attachments to the created post (as post owner)
 * 4. Retrieve the attachments for the post via the public GET endpoint
 * 5. Assert all uploaded attachments are returned and metadata matches
 */
export async function test_api_discussionBoard_test_list_attachments_for_post_with_multiple_attachments(
  connection: api.IConnection,
) {
  // 1. Simulate a thread ID to use for the post (since no thread creation API is given)
  const threadId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Create a post in the thread as this (auth'd) member
  const postBody: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: threadId,
    body: RandomGenerator.paragraph()(),
  };
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: postBody,
    },
  );
  typia.assert(post);

  // 3. Upload two attachments to this post
  const attachments = await Promise.all([
    api.functional.discussionBoard.member.posts.attachments.create(connection, {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        uploader_member_id: post.creator_member_id,
        file_uri: "https://cdn.example.com/example1.pdf",
        file_name: "example1.pdf",
        mime_type: "application/pdf",
      },
    }),
    api.functional.discussionBoard.member.posts.attachments.create(connection, {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        uploader_member_id: post.creator_member_id,
        file_uri: "https://cdn.example.com/example2.jpg",
        file_name: "example2.jpg",
        mime_type: "image/jpeg",
      },
    }),
  ]);

  // FIX: individually assert each
  attachments.forEach((att) => typia.assert(att));

  // 4. Retrieve list of attachments for the post
  // (SDK's return is ISummary: if not an array, wrap for convenience)
  const result = await api.functional.discussionBoard.posts.attachments.index(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(result);
  const summaries = Array.isArray(result) ? result : [result];

  // 5. Verify that all uploaded attachments are present with correct metadata
  const uploadedMap = Object.fromEntries(
    attachments.map((att) => [att.file_name, att]),
  );
  summaries.forEach((summary) => {
    const uploaded = uploadedMap[summary.file_name];
    if (!uploaded)
      throw new Error(
        `Attachment ${summary.file_name} missing in upload record`,
      );
    TestValidator.equals("discussion_board_post_id")(
      summary.discussion_board_post_id,
    )(uploaded.discussion_board_post_id);
    TestValidator.equals("uploader_member_id")(summary.uploader_member_id)(
      uploaded.uploader_member_id,
    );
    TestValidator.equals("mime_type")(summary.mime_type)(uploaded.mime_type);
    TestValidator.equals("file_uri")(summary.file_uri)(uploaded.file_uri);
    TestValidator.equals("file_name")(summary.file_name)(uploaded.file_name);
    TestValidator.predicate("uploaded_at is valid ISO date-time")(
      !!summary.uploaded_at &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(summary.uploaded_at),
    );
  });
  // Check count (should match number uploaded)
  TestValidator.equals("attachment count")(summaries.length)(
    attachments.length,
  );
}
