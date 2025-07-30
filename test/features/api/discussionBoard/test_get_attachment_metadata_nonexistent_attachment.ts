import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Validate error response when getting metadata for a non-existent attachmentId
 * on an existing post.
 *
 * This test checks that the API properly returns an error (e.g., 404 Not Found)
 * when fetching attachment metadata for an ID that does not exist for the given
 * post. It ensures the endpoint is resilient to requests for orphaned or
 * invalid entity combinations, covering a critical negative-path scenario for
 * file attachments.
 *
 * Steps:
 *
 * 1. Create a new post in a thread with valid member context (using the
 *    posts.create API)
 * 2. Attempt to GET /discussionBoard/posts/:postId/attachments/:attachmentId with
 *    the newly created postId but with a random attachmentId (guaranteed not to
 *    exist)
 * 3. Confirm that the API throws an error (TestValidator.error) for this invalid
 *    attachmentId/postId combination
 */
export async function test_api_discussionBoard_test_get_attachment_metadata_nonexistent_attachment(
  connection: api.IConnection,
) {
  // 1. Create a parent post
  const threadId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const postBody: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: threadId,
    body: "Post body for attachment not found test",
  };
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: postBody,
    },
  );
  typia.assert(post);

  // 2. Attempt to fetch an attachment with a non-existent attachmentId for this post
  const fakeAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Fetching non-existent attachment should fail")(
    async () => {
      await api.functional.discussionBoard.posts.attachments.at(connection, {
        postId: post.id,
        attachmentId: fakeAttachmentId,
      });
    },
  );
}
