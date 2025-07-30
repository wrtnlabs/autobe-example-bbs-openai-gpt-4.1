import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test that a board member can update their own comment's content.
 *
 * Business Scenario: A discussion board member wishes to edit their previously
 * posted comment.
 *
 * Step-by-step process:
 *
 * 1. Register a new discussion board member (using admin privilege).
 * 2. Create a comment by that member, tied to a random post (simulated by random
 *    UUID).
 * 3. Update that comment's content with a new non-empty string.
 * 4. Assert that the update was successful:
 *
 *    - The returned comment retains the same id, author, and post linkage.
 *    - The content is updated to the new value.
 *
 * Preconditions: No real posts required; comment uses a fake post UUID (test
 * isolation).
 */
export async function test_api_discussionBoard_member_comments_test_update_own_comment_with_valid_content(
  connection: api.IConnection,
) {
  // 1. Register a new board member via admin
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(12),
    joined_at: new Date().toISOString(),
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberInput },
  );
  typia.assert(member);

  // 2. Create the initial comment as this member
  const fakePostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const origContent = RandomGenerator.paragraph()();
  const commentInput: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: member.id,
    discussion_board_post_id: fakePostId,
    content: origContent,
  };
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    { body: commentInput },
  );
  typia.assert(comment);
  TestValidator.equals("comment content matches created")(comment.content)(
    origContent,
  );
  TestValidator.equals("author matches")(comment.discussion_board_member_id)(
    member.id,
  );
  TestValidator.equals("comment post matches")(
    comment.discussion_board_post_id,
  )(fakePostId);

  // 3. Update the comment content to a new non-empty value
  const newContent = RandomGenerator.paragraph()();
  const updated = await api.functional.discussionBoard.member.comments.update(
    connection,
    {
      commentId: comment.id,
      body: { content: newContent },
    },
  );
  typia.assert(updated);

  // 4. Assert update: ids, author, post unchanged, content is new
  TestValidator.equals("comment id")(updated.id)(comment.id);
  TestValidator.equals("author unchanged")(updated.discussion_board_member_id)(
    member.id,
  );
  TestValidator.equals("post unchanged")(updated.discussion_board_post_id)(
    comment.discussion_board_post_id,
  );
  TestValidator.equals("content updated")(updated.content)(newContent);
}
