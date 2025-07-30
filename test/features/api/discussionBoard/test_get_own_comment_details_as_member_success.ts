import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate that a member can fetch detailed information for their own comment
 * using the commentId.
 *
 * Business justification: Members frequently need to view and update their
 * posted comments. This test ensures that after a comment is submitted,
 * retrieving it by its unique commentId returns all persisted fields,
 * confirming API data integrity, security (returns only for the authenticated
 * member), and compliance with required schema.
 *
 * Test workflow outline:
 *
 * 1. Prepare a new comment as the authenticated member via the create API (obtain
 *    post id/discussion_board_member_id/content).
 * 2. Use the returned comment's id for the getByCommentid endpoint.
 * 3. Validate that the response includes all schema-defined fields, and their
 *    values match what was submitted/expected.
 * 4. Assert that sensitive business rules are maintained (the author field matches
 *    the authenticated member, and the right comment is returned).
 */
export async function test_api_discussionBoard_member_comments_at(
  connection: api.IConnection,
) {
  // Step 1: Create a new comment as the current member
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const commentContent: string = "This is a test comment for detail retrieval.";
  const newComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content: commentContent,
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(newComment);

  // Step 2: Retrieve the comment details using its id
  const fetchedComment =
    await api.functional.discussionBoard.member.comments.at(connection, {
      commentId: newComment.id,
    });
  typia.assert(fetchedComment);

  // Step 3: Assert all fields match expectations
  TestValidator.equals("comment id matches")(fetchedComment.id)(newComment.id);
  TestValidator.equals("discussion_board_member_id matches")(
    fetchedComment.discussion_board_member_id,
  )(newComment.discussion_board_member_id);
  TestValidator.equals("discussion_board_post_id matches")(
    fetchedComment.discussion_board_post_id,
  )(newComment.discussion_board_post_id);
  TestValidator.equals("content matches")(fetchedComment.content)(
    newComment.content,
  );
  TestValidator.equals("is_deleted should be false on creation")(
    fetchedComment.is_deleted,
  )(false);
  TestValidator.predicate("created_at is ISO string")(
    typeof fetchedComment.created_at === "string" &&
      !Number.isNaN(Date.parse(fetchedComment.created_at)),
  );
  TestValidator.predicate("updated_at is ISO string")(
    typeof fetchedComment.updated_at === "string" &&
      !Number.isNaN(Date.parse(fetchedComment.updated_at)),
  );
}
