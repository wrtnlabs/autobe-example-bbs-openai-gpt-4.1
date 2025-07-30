import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Verify that a moderator can update any comment's content by commentId.
 *
 * This test ensures that a moderator is able to update the content of a comment
 * that was originally created by a different member, using the
 * moderator-specific update endpoint.
 *
 * Steps:
 *
 * 1. Create a comment as a standard member (with random valid memberId and
 *    postId).
 * 2. As a moderator, update the comment's content via the moderator API.
 * 3. Assert that the returned comment object has the new content, the same IDs, an
 *    updated timestamp, and all other fields remain as expected (is_deleted is
 *    preserved, etc.).
 * 4. Note: Audit/log verification is omitted since not available in return types.
 */
export async function test_api_discussionBoard_test_moderator_update_comment_content_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a comment as a standard member
  const samplePostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sampleMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const originalContent: string = RandomGenerator.paragraph()();

  const created = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_post_id: samplePostId,
        discussion_board_member_id: sampleMemberId,
        content: originalContent,
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(created);

  // 2. Update the comment as a moderator
  const moderatorContent: string = `${RandomGenerator.paragraph()()} (edited by moderator)`;
  const updated =
    await api.functional.discussionBoard.moderator.comments.update(connection, {
      commentId: created.id,
      body: {
        content: moderatorContent,
      } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(updated);

  // 3. Assertions on update behavior
  TestValidator.equals("comment id remains the same")(updated.id)(created.id);
  TestValidator.equals("post id remains")(updated.discussion_board_post_id)(
    created.discussion_board_post_id,
  );
  TestValidator.equals("author member id remains")(
    updated.discussion_board_member_id,
  )(created.discussion_board_member_id);
  TestValidator.notEquals("content was modified")(updated.content)(
    created.content,
  );
  TestValidator.equals("content now matches moderator-provided")(
    updated.content,
  )(moderatorContent);
  TestValidator.notEquals("timestamp updated")(updated.updated_at)(
    created.updated_at,
  );
  TestValidator.equals("is_deleted remains")(updated.is_deleted)(
    created.is_deleted,
  );
  // 4. No audit verification possible in return types
}
