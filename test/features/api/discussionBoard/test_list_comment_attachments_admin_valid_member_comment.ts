import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate that an admin can retrieve all attachments for a comment authored by
 * a member.
 *
 * This test ensures:
 *
 * - Admin creates a new member
 * - Member creates a comment under a post
 * - Admin attaches files to that comment
 * - Admin lists all attachments and verifies all files, with correct metadata
 *
 * Steps:
 *
 * 1. As admin, create a new IDiscussionBoardMember (member)
 * 2. Create a valid postId (simulate as random UUID for test context)
 * 3. As member, create a comment attached to the postId
 *    (discussion_board_member_id is member.id)
 * 4. As admin, attach two files to the created comment
 * 5. As admin, retrieve all attachments for that comment
 * 6. Validate all attached files are present, with correct fields
 */
export async function test_api_discussionBoard_test_list_comment_attachments_admin_valid_member_comment(
  connection: api.IConnection,
) {
  // 1. Admin creates a member
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a test post ID (simulate with random UUID)
  const postId = typia.random<string & tags.Format<"uuid">>();

  // 3. Member creates a comment under the post
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId,
        content: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 4. Admin attaches two files to the comment
  const attachments = await Promise.all([
    api.functional.discussionBoard.admin.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: member.id,
          file_name: "file1.txt",
          file_url: "https://cdn.example.com/file1.txt",
          mime_type: "text/plain",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    ),
    api.functional.discussionBoard.admin.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: member.id,
          file_name: "file2.png",
          file_url: "https://cdn.example.com/file2.png",
          mime_type: "image/png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    ),
  ]);
  attachments.forEach((a) => typia.assert(a));

  // 5. Admin retrieves list of attachments for that comment
  const listed =
    await api.functional.discussionBoard.admin.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(listed);

  // 6. Validate the response contains both attachments and metadata matches
  TestValidator.equals("attachment count matches")(listed.data.length)(
    attachments.length,
  );
  const byName = Object.fromEntries(listed.data.map((a) => [a.file_name, a]));
  for (const [i, input] of [
    {
      file_name: "file1.txt",
      mime_type: "text/plain",
      file_url: "https://cdn.example.com/file1.txt",
    },
    {
      file_name: "file2.png",
      mime_type: "image/png",
      file_url: "https://cdn.example.com/file2.png",
    },
  ].entries()) {
    const found = byName[input.file_name];
    TestValidator.predicate(`attachment #${i + 1} present`)(!!found);
    if (found) {
      TestValidator.equals(`file_name #${i + 1}`)(found.file_name)(
        input.file_name,
      );
      TestValidator.equals(`mime_type #${i + 1}`)(found.mime_type)(
        input.mime_type,
      );
      TestValidator.equals(`file_url #${i + 1}`)(found.file_url)(
        input.file_url,
      );
      TestValidator.equals(`uploader_member_id #${i + 1}`)(
        found.uploader_member_id,
      )(member.id);
      TestValidator.equals(`discussion_board_comment_id #${i + 1}`)(
        found.discussion_board_comment_id,
      )(comment.id);
      TestValidator.predicate(`uploaded_at #${i + 1} is date-time`)(
        !isNaN(Date.parse(found.uploaded_at)),
      );
    }
  }
}
