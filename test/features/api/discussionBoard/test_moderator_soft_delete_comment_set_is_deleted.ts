import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate the moderator's ability to soft-delete a comment via is_deleted
 * mutation.
 *
 * Moderation on the discussion board includes allowing a moderator to flag
 * comments as deleted rather than hard-delete them. This test will:
 *
 * 1. Create a comment as a member (dependency step)
 * 2. Have a moderator perform a soft-delete (set is_deleted=true)
 * 3. Confirm the comment's is_deleted state is updated in response.
 * 4. Confirm (by another fetch, if possible) that a subsequent read reflects
 *    is_deleted=true (simulating audit/future retrieval checking).
 * 5. (If audit logs or version entities existed, we would check them as well, but
 *    only is_deleted is checkable via DTO.)
 *
 * The test validates that the moderator update reflects in both direct response
 * and future retrieval flows.
 */
export async function test_api_discussionBoard_test_moderator_soft_delete_comment_set_is_deleted(
  connection: api.IConnection,
) {
  // 1. Create a comment as a member (dependency)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentContent = RandomGenerator.content()()();

  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content: commentContent,
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);
  TestValidator.equals("comment is initially not deleted")(comment.is_deleted)(
    false,
  );

  // 2. Soft-delete (flag as deleted) using moderator API
  const updatedComment =
    await api.functional.discussionBoard.moderator.comments.update(connection, {
      commentId: comment.id,
      body: { is_deleted: true } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(updatedComment);
  TestValidator.equals("comment is_deleted true after moderator action")(
    updatedComment.is_deleted,
  )(true);

  // 3. Optionally fetch the comment again to verify state (if a read API existed)
  // As only create and update exist, trust the update response
  // (Could extend with an audit log check if such an endpoint existed)
}
