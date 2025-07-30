import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Test that a moderator can access attachments for a private/restricted
 * comment.
 *
 * This test ensures that a moderator's elevated privileges allow them to view
 * all attachments linked to a comment, regardless of any member-only or private
 * restrictions that would normally limit access for regular users.
 *
 * Steps:
 *
 * 1. Create a comment as a member, representing a private/restricted comment
 * 2. Attach a file to that comment as the same member
 * 3. As a moderator, list attachments for the comment
 * 4. Verify the attachment is visible to the moderator in the returned data
 */
export async function test_api_discussionBoard_test_list_comment_attachments_as_moderator_for_private_comment(
  connection: api.IConnection,
) {
  // 1. Create a private/restricted comment as a member
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content: RandomGenerator.paragraph()(),
      },
    },
  );
  typia.assert(comment);

  // 2. Attach a file to that comment as the member
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: memberId,
          file_name: "mod-visible.pdf",
          file_url: "https://cdn.example.com/mod-visible.pdf",
          mime_type: "application/pdf",
        },
      },
    );
  typia.assert(attachment);

  // 3. As moderator, list attachments for the comment
  const page =
    await api.functional.discussionBoard.moderator.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(page);

  // 4. Verify attachment is visible to the moderator in the returned data
  TestValidator.predicate("attachment is visible to moderator")(
    page.data.some(
      (a) => a.id === attachment.id && a.file_url === attachment.file_url,
    ),
  );
}
