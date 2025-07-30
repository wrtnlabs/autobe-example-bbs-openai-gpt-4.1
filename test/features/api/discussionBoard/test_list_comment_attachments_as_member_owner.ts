import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validates that a member (the owner of the comment) can properly retrieve all
 * attachments for their comment.
 *
 * PRECONDITIONS:
 *
 * - There must exist a comment created by this member.
 * - The comment must have at least one attachment record.
 *
 * STEPS:
 *
 * 1. Create a comment as a member
 * 2. Attach at least one attachment to this comment (simulate file info, etc)
 * 3. Call the API to fetch all attachments for this comment as the same member
 * 4. Validate that the returned list contains at least the attachment created,
 *    with correct fields.
 */
export async function test_api_discussionBoard_test_list_comment_attachments_as_member_owner(
  connection: api.IConnection,
) {
  // 1. Create a comment as a member (simulate all necessary fields)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentContent = RandomGenerator.paragraph()();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content: commentContent,
      },
    },
  );
  typia.assert(comment);

  // 2. Attach an attachment to this comment
  const attachmentInput = {
    discussion_board_comment_id: comment.id,
    uploader_member_id: memberId,
    file_name: `file_${RandomGenerator.alphaNumeric(8)}.png`,
    file_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}`,
    mime_type: "image/png",
  } satisfies IDiscussionBoardCommentAttachment.ICreate;
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 3. List all attachments for this comment as the owner
  const list =
    await api.functional.discussionBoard.member.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(list);

  // 4. Validate that the new attachment exists in the result
  TestValidator.predicate("at least one attachment present")(
    list.data.length >= 1,
  );
  const found = list.data.find((a) => a.id === attachment.id);
  TestValidator.predicate("created attachment found in list")(!!found);
  if (found) {
    TestValidator.equals("file name matches")(found.file_name)(
      attachment.file_name,
    );
    TestValidator.equals("file url matches")(found.file_url)(
      attachment.file_url,
    );
    TestValidator.equals("mime type matches")(found.mime_type)(
      attachment.mime_type,
    );
    TestValidator.equals("uploader matches")(found.uploader_member_id)(
      memberId,
    );
    TestValidator.equals("comment relation matches")(
      found.discussion_board_comment_id,
    )(comment.id);
  }
}
