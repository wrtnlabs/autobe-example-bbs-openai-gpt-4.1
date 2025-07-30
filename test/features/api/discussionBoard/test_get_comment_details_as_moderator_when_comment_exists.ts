import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validates that a moderator can retrieve the full details of an existing
 * discussion board comment using the moderator API endpoint.
 *
 * Business context: Moderators of the discussion board need to be able to view
 * the complete details of any comment, regardless of deletion status or post
 * restrictions, when supplied with the comment's UUID. This test ensures that
 * the endpoint exposes all persisted fields as described in the schema for
 * proper moderation and audit purposes.
 *
 * Test Steps:
 *
 * 1. Create a new comment as a member (prerequisite and to obtain a real
 *    commentId).
 * 2. Use the moderator API endpoint to fetch the comment by its id.
 * 3. Assert that all persisted schema fields are correctly returned and match the
 *    originally created values:
 *
 *    - Id, discussion_board_member_id, discussion_board_post_id, content,
 *         is_deleted, created_at, updated_at
 * 4. This verifies that moderators can access detailed comment data for any
 *    comment in the system.
 */
export async function test_api_discussionBoard_test_get_comment_details_as_moderator_when_comment_exists(
  connection: api.IConnection,
) {
  // 1. Create a comment as a member to set up a known comment record
  const commentInput: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: typia.random<string & tags.Format<"uuid">>(),
    discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
    content: "Test comment content for moderator detail access",
  };
  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: commentInput,
    });
  typia.assert(createdComment);

  // 2. Moderator fetches the comment by commentId
  const moderatorView: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.comments.at(connection, {
      commentId: createdComment.id,
    });
  typia.assert(moderatorView);

  // 3. Assert all persisted schema fields are present and match the creation
  TestValidator.equals("comment id matches")(moderatorView.id)(
    createdComment.id,
  );
  TestValidator.equals("member id matches")(
    moderatorView.discussion_board_member_id,
  )(createdComment.discussion_board_member_id);
  TestValidator.equals("post id matches")(
    moderatorView.discussion_board_post_id,
  )(createdComment.discussion_board_post_id);
  TestValidator.equals("content matches")(moderatorView.content)(
    createdComment.content,
  );
  TestValidator.equals("is_deleted matches")(moderatorView.is_deleted)(
    createdComment.is_deleted,
  );
  TestValidator.equals("created_at matches")(moderatorView.created_at)(
    createdComment.created_at,
  );
  TestValidator.equals("updated_at matches")(moderatorView.updated_at)(
    createdComment.updated_at,
  );
}
