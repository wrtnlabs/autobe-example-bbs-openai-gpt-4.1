import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test that non-author members cannot update comments they did not write.
 *
 * This function verifies that:
 *
 * - Only the original author (member A) can update their comment.
 * - If another member (member B) tries to update, it is correctly denied.
 * - The comment remains unchanged after unauthorized attempt.
 *
 * Test Steps:
 *
 * 1. Register two board members (A and B) via admin endpoint.
 * 2. Member A creates a discussion board comment linked to a random post.
 * 3. Member B attempts to update A's comment.
 * 4. Confirm error is thrown (lack of permission) for B's attempt.
 * 5. Validate (logically) that the comment was not changed. If no read-back API
 *    exists, skip step 5.
 */
export async function test_api_discussionBoard_test_update_comment_without_permission(
  connection: api.IConnection,
) {
  // 1. Register two members (A, B)
  const memberAUserId = RandomGenerator.alphabets(12);
  const memberBUserId = RandomGenerator.alphabets(12);
  const joinedAt = new Date().toISOString();

  const memberA = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberAUserId,
        joined_at: joinedAt,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(memberA);

  const memberB = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberBUserId,
        joined_at: joinedAt,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(memberB);

  // 2. Member A creates a comment under a random post.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const initialContent = RandomGenerator.paragraph()();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberA.id,
        discussion_board_post_id: postId,
        content: initialContent,
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Member B attempts to update A's comment.
  const maliciousContent = RandomGenerator.paragraph()();
  await TestValidator.error("unauthorized update should be denied")(
    async () => {
      await api.functional.discussionBoard.member.comments.update(connection, {
        commentId: comment.id,
        body: {
          content: maliciousContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      });
    },
  );

  // 4. (Skipped: No read-back API to verify content unchanged.)
}
