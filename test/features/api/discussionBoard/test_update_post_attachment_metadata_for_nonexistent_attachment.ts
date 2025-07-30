import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Test error case for updating metadata of a non-existent attachment on a
 * discussion board post.
 *
 * This test verifies that the proper error is returned by the API when
 * attempting to update an attachment (by attachmentId) that does not exist on a
 * valid post. It ensures the endpoint correctly handles the scenario of a
 * client requesting updates to resource records that are not found.
 *
 * Steps:
 *
 * 1. Create a valid threadId and use it to create a new post (precondition for
 *    having a post).
 * 2. Attempt to update an attachment on the created post using a random
 *    (guaranteed-nonexistent) attachmentId. The update payload may use random
 *    values for updatable fields.
 * 3. Assert that the API responds with an error (e.g., 404 or similar indicating
 *    resource not found).
 */
export async function test_api_discussionBoard_test_update_post_attachment_metadata_for_nonexistent_attachment(
  connection: api.IConnection,
) {
  // 1. Create a valid post for context
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: {
        discussion_board_thread_id: threadId,
        body: "This is a test post for attachment update error scenario.",
      },
    },
  );
  typia.assert(post);

  // 2. Attempt to update a non-existent attachment on the post
  const nonExistentAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("update non-existent attachment should fail")(
    async () => {
      await api.functional.discussionBoard.member.posts.attachments.update(
        connection,
        {
          postId: post.id,
          attachmentId: nonExistentAttachmentId,
          body: {
            file_name: "updated_file.pdf",
          },
        },
      );
    },
  );
}
