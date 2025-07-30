import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Verify that a moderator can retrieve all attachments for a specific comment,
 * including those on comments owned by other users.
 *
 * Business context: Moderators must be able to view (list) attachments
 * belonging to any comment for moderation, audit, and oversight purposes—even
 * if those comments are authored by regular members. This is essential for
 * verifying content policy violations, copyright, or handling takedown
 * requests.
 *
 * Test workflow:
 *
 * 1. Simulate creation of a comment as a regular board member (owner may be
 *    another user).
 * 2. Attach at least one file to the comment via the member API—simulate member
 *    file upload.
 * 3. Use the moderator's endpoint to list all attachments for the comment.
 * 4. Assert the response is correct:
 *
 *    - The attachment(s) returned exactly match the one(s) created: id, filename,
 *         URL, MIME type, uploader.
 *    - Structure and pagination data are present as required.
 *    - Moderator-level privilege reveals attachments for comments not their own.
 */
export async function test_api_discussionBoard_test_list_comment_attachments_as_moderator_success(
  connection: api.IConnection,
) {
  // 1. Create a comment as a regular member
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 2. Upload at least one attachment as the member
  const attachmentInput: IDiscussionBoardCommentAttachment.ICreate = {
    discussion_board_comment_id: comment.id,
    uploader_member_id: memberId,
    file_name: `file_${RandomGenerator.alphaNumeric(8)}.jpg`,
    file_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(12)}`,
    mime_type: "image/jpeg",
  };
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: attachmentInput,
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

  // 4. Assert correctness of response:
  //  - At least the uploaded attachment must be present and fields must match
  const found = page.data.find((a) => a.id === attachment.id);
  TestValidator.predicate("attachment is present in moderator listing")(
    !!found,
  );
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
    TestValidator.equals("uploader id matches")(found.uploader_member_id)(
      attachment.uploader_member_id,
    );
    TestValidator.equals("comment id matches")(
      found.discussion_board_comment_id,
    )(attachment.discussion_board_comment_id);
  }

  //  - Attachment list must be array and pagination info should be present
  TestValidator.predicate("attachments is array")(Array.isArray(page.data));
  TestValidator.predicate("pagination structure exists")(!!page.pagination);
  if (page.pagination) {
    TestValidator.predicate("pagination current page is number")(
      typeof page.pagination.current === "number",
    );
    TestValidator.predicate("pagination total pages is number")(
      typeof page.pagination.pages === "number",
    );
    TestValidator.predicate("pagination record count is number")(
      typeof page.pagination.records === "number",
    );
    TestValidator.predicate("pagination limit is number")(
      typeof page.pagination.limit === "number",
    );
  }
}
