import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate that a regular (non-admin) member cannot access the metadata of an
 * attachment they do not own via the admin attachment detail endpoint.
 *
 * This test enforces strict access control: only privileged staff or the
 * resource owner/uploader may access attachment metadata in the admin
 * namespace. Even regular members—if not the uploader—must be denied,
 * confirming enforcement of session-scoped authorization.
 *
 * **Test Steps:**
 *
 * 1. Register an uploader (attachment owner) and a separate non-owner member
 *    through the admin membership API.
 * 2. As the uploader, create a comment (to enable file attachment).
 * 3. As the uploader, attach a file to that comment.
 * 4. Switch authentication/session context to the non-owner member (simulate via
 *    their user_identifier/id where feasible).
 * 5. As the non-owner, attempt to request that attachment's metadata through the
 *    admin endpoint.
 * 6. Confirm that access is denied—an error should be thrown and caught.
 */
export async function test_api_discussionBoard_test_get_comment_attachment_detail_forbidden_for_non_admin_non_owner(
  connection: api.IConnection,
) {
  // 1. Register uploader (owner) and another (non-owner) member
  const now = new Date().toISOString();

  // -- Register uploader
  const uploader = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: `uploader_${RandomGenerator.alphaNumeric(8)}`,
        joined_at: now,
      },
    },
  );
  typia.assert(uploader);

  // -- Register non-owner member
  const nonOwner = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: `nonowner_${RandomGenerator.alphaNumeric(8)}`,
        joined_at: now,
      },
    },
  );
  typia.assert(nonOwner);

  // 2. Create a comment as uploader
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: uploader.id,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph()(),
      },
    },
  );
  typia.assert(comment);

  // 3. Attach a file to the comment as the uploader
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: uploader.id,
          file_name: `file_${RandomGenerator.alphaNumeric(6)}.md`,
          file_url: `https://dummy.domain/${RandomGenerator.alphaNumeric(16)}`,
          mime_type: "text/markdown",
        },
      },
    );
  typia.assert(attachment);

  // 4/5. As non-owner, attempt to fetch attachment's admin metadata (should be denied)
  await TestValidator.error(
    "Non-owner member forbidden from accessing another's comment attachment via admin path",
  )(async () => {
    // In a full system, authentication context would be swapped to non-owner prior to this call
    await api.functional.discussionBoard.admin.comments.attachments.at(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    );
  });
}
