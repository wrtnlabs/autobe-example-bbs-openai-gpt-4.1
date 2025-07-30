import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Validate denial of post attachment upload for users without permission.
 *
 * This test ensures that users who are not the owner of a discussion board
 * post, or attempt to upload attachments to a post in a locked (non-editable)
 * state, are denied access. The API must enforce access control by returning an
 * error when such users attempt to upload a file. The steps simulate two error
 * scenarios: uploading as another member and uploading to a locked post.
 *
 * 1. Create a discussion board post as User A (post owner)
 * 2. Attempt to upload an attachment to the post as User B (not the owner)
 *
 *    - Expect access denied error
 * 3. (Optional) Simulate post being in a locked state (if available, but skip if
 *    no such flag exists)
 *
 *    - Attempt to upload as owner when post is "locked" (skip if not feasible by
 *         API)
 *
 * Note: Only implement scenarios technically feasible with the given API
 * functions and DTOs.
 */
export async function test_api_discussionBoard_test_create_post_attachment_without_permission(
  connection: api.IConnection,
) {
  // 1. Create a discussion board post as User A (the post owner)
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const postBody: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: threadId,
    body: "Test body for permission denial scenario.",
  };
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: postBody,
    },
  );
  typia.assert(post);

  // 2. Attempt to upload an attachment as another member (not the owner)
  // Simulate a different uploader_member_id than the post owner
  TestValidator.error("Uploading attachment as non-owner must be denied")(
    async () => {
      await api.functional.discussionBoard.member.posts.attachments.create(
        connection,
        {
          postId: post.id,
          body: {
            discussion_board_post_id: post.id,
            uploader_member_id: typia.random<string & tags.Format<"uuid">>(), // not the owner
            file_uri: "https://example.com/file.png",
            file_name: "file.png",
            mime_type: "image/png",
          },
        },
      );
    },
  );

  // 3. Skipped: locked post upload scenario (no lock/close field in the DTO/API)
}
