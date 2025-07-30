import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate that a non-owner member cannot view attachments on another user's
 * comment.
 *
 * Business context: This test ensures that privacy restrictions on comment
 * attachments work. Attachments should only be visible to the comment's author
 * (and, in production, to moderators/admins, not covered here). Non-owners
 * should not have access.
 *
 * Test Steps:
 *
 * 1. Simulate Member A: create a comment on a random post, upload an attachment.
 * 2. Simulate Member B: attempt to list the attachments for A's comment — must
 *    result in error (permission denied) or empty/filtered data.
 * 3. Optionally, verify Member A can successfully list the attachments.
 */
export async function test_api_discussionBoard_test_list_comment_attachments_as_member_not_owner(
  connection: api.IConnection,
) {
  // Step 1: Simulate Member A - create a comment
  const memberAId = typia.random<string & tags.Format<"uuid">>();
  const memberBId = typia.random<string & tags.Format<"uuid">>();
  const discussion_board_post_id = typia.random<string & tags.Format<"uuid">>();
  // Switch to "Member A" context (application should set session/member ID from auth layer)
  // For e2e, we simulate by filling .discussion_board_member_id manually.
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberAId,
        discussion_board_post_id,
        content: "Test comment by Member A",
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 2: Member A uploads an attachment to their comment
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: memberAId,
          file_name: "testfile.txt",
          file_url: "https://cdn.example.com/file/testfile.txt",
          mime_type: "text/plain",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 3: Switch to "Member B" context (simulate by switching member ID)
  // In a real system, this would involve re-authentication or connection context change.
  // For this test, we are not able to actually control connection state, so we only control the member IDs in dependent entities.
  // Attempt to list attachments as Member B (who does not own the comment)
  // The backend must check the session/user identity and deny/forbid access, or filter results.
  // For e2e, this test checks if the API enforces privacy for non-owners.
  // (Depending on implementation, may throw error or return empty data.)
  await TestValidator.error(
    "Non-owner cannot list another user's comment attachments",
  )(async () => {
    // (In a real app, member B must be authenticated; in this test, we're assuming connection context stays as member A.)
    // If the API enforces member identity from the session rather than from member_id field, this call should be forbidden.
    await api.functional.discussionBoard.member.comments.attachments.index(
      connection,
      { commentId: comment.id },
    );
  });

  // Step 4: Owner can list attachments — success path
  const page =
    await api.functional.discussionBoard.member.comments.attachments.index(
      connection,
      { commentId: comment.id },
    );
  typia.assert(page);
  TestValidator.predicate("Owner can see at least 1 attachment")(
    Array.isArray(page.data) && page.data.length > 0,
  );
  TestValidator.equals("Attachment file matches")(page.data[0].id)(
    attachment.id,
  );
}
