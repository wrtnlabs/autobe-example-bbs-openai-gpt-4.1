import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that a non-author member cannot search attachments of another
 * member's comment.
 *
 * This test ensures that only the author of a comment (or admin/mod roles) can
 * search for its attachments. It verifies the security access control that
 * prevents ordinary members from querying another member's comment
 * attachments.
 *
 * Steps:
 *
 * 1. Admin creates two distinct board members.
 * 2. The first member creates a comment.
 * 3. The second member attempts to search attachments for the first member's
 *    comment (should be denied).
 * 4. Assert that the API denies access with no attachments data returned.
 */
export async function test_api_discussionBoard_test_search_comment_attachments_access_by_non_owner_member(
  connection: api.IConnection,
) {
  // 1. Admin creates two members (member1 and member2)
  const member1Input: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(12),
    joined_at: new Date().toISOString(),
  };
  const member1 = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: member1Input,
    },
  );
  typia.assert(member1);

  const member2Input: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(12),
    joined_at: new Date().toISOString(),
  };
  const member2 = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: member2Input,
    },
  );
  typia.assert(member2);

  // 2. Member1 creates a comment (simulate their session by supplying their member id)
  const commentInput: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: member1.id,
    discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
    content: RandomGenerator.paragraph()(),
  };
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: commentInput,
    },
  );
  typia.assert(comment);

  // 3. As member2, attempt to search attachments for member1's comment
  // This should be denied since member2 is not the comment's author.
  await TestValidator.error(
    "Only the comment author may search their attachments",
  )(async () => {
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          // Provide no uploader_member_id so it is "anyone"
        },
      },
    );
  });
}
