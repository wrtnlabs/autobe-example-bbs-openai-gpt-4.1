import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test that a moderator can successfully perform a permanent deletion of any
 * comment.
 *
 * Business context: Moderators sometimes must hard-delete problematic comments
 * (spam, abusive, etc). This test ensures that a moderator, when authenticated,
 * can permanently remove any user's comment using its unique commentId. The
 * operation should fully erase the comment: after deletion, attempts to
 * retrieve it should result in a not-found/error condition.
 *
 * Steps:
 *
 * 1. Create a board member (dependency: admin action).
 * 2. Have the member author a comment by calling the appropriate API.
 * 3. Use a moderator account/privileges to perform DELETE on the comment by id.
 * 4. Validate no errors occur (204/no content on success).
 * 5. Optionally, verify subsequent queries for this commentId fail (not found).
 */
export async function test_api_discussionBoard_test_moderator_delete_comment_success(
  connection: api.IConnection,
) {
  // 1. Create a board member (admin action)
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(8),
    joined_at: new Date().toISOString(),
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: memberInput,
    },
  );
  typia.assert(member);

  // 2. Member creates a comment (attach random post id)
  const commentInput: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: member.id,
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

  // 3. Moderator deletes the comment
  await api.functional.discussionBoard.moderator.comments.erase(connection, {
    commentId: comment.id,
  });

  // 4. Validate that the comment is deleted: subsequent delete on same id should error
  await TestValidator.error("Comment should not exist after deletion")(
    async () => {
      await api.functional.discussionBoard.moderator.comments.erase(
        connection,
        {
          commentId: comment.id,
        },
      );
    },
  );
}
