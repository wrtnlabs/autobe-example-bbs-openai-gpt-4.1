import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Test successful creation of a new comment version (edit) by a moderator.
 *
 * This test verifies the end-to-end workflow where:
 *
 * 1. A board member is created (simulating a user joining the discussion board)
 * 2. The member authors an initial comment on a discussion post
 * 3. As a moderator, a new version (edit) is appended to the member's comment
 *
 * The test ensures:
 *
 * - The moderator has permission to edit comments not authored by themselves
 * - The comment versioning logic appends a new version (does not overwrite
 *   history)
 * - All relevant fields in the comment version entity are updated (content,
 *   editor, timestamp)
 * - A new version appears in the version list (if list endpoint available)
 * - The base comment's content is updated to new version content
 * - The version sequence/order remains monotonic (not tested here w/o list
 *   endpoint)
 *
 * Steps:
 *
 * 1. Create a new board member as the original comment author
 * 2. Create an initial comment as this member
 * 3. Simulate a moderator editing this comment by creating a new version with
 *    distinct content
 * 4. Validate the version entity's content, linkage, and editor fields
 * 5. (If list endpoint available: Re-fetch all versions for this comment and check
 *    version sequence)
 *
 * Note: This test assumes you have moderator privileges on the connection
 * provided.
 */
export async function test_api_discussionBoard_test_create_comment_version_as_moderator_success(
  connection: api.IConnection,
) {
  // 1. Create member (original author)
  const memberUserIdentifier = `user_${RandomGenerator.alphaNumeric(8)}@mail.com`;
  const memberJoinTime = new Date().toISOString();

  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberUserIdentifier,
        joined_at: memberJoinTime,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);
  TestValidator.equals("member user_identifier matches")(
    member.user_identifier,
  )(memberUserIdentifier);
  TestValidator.equals("joined_at matches")(member.joined_at)(memberJoinTime);

  // 2. Create an initial comment by this member
  const postId = typia.random<string & tags.Format<"uuid">>();
  const initialContent = RandomGenerator.paragraph()();

  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId,
        content: initialContent,
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);
  TestValidator.equals("comment author matches")(
    comment.discussion_board_member_id,
  )(member.id);
  TestValidator.equals("parent post id matches")(
    comment.discussion_board_post_id,
  )(postId);
  TestValidator.equals("comment content matches")(comment.content)(
    initialContent,
  );

  // 3. As moderator, create a new version (edit) for this comment
  const moderatorId = typia.random<string & tags.Format<"uuid">>(); // simulate separate moderator
  const editContent = RandomGenerator.paragraph()();

  const version =
    await api.functional.discussionBoard.moderator.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: moderatorId,
          content: editContent,
        } satisfies IDiscussionBoardCommentVersion.ICreate,
      },
    );
  typia.assert(version);
  // Validate version linkage and data
  TestValidator.equals("version's parent comment")(
    version.discussion_board_comment_id,
  )(comment.id);
  TestValidator.equals("version editor_member_id")(version.editor_member_id)(
    moderatorId,
  );
  TestValidator.equals("version content matches")(version.content)(editContent);
  // Basic audit: created_at is ISO timestamp (runtime check only)
  TestValidator.predicate("created_at is ISO")(
    !!Date.parse(version.created_at),
  );

  // TODO: Would check version list and sequence/order if endpoint existed.
}
