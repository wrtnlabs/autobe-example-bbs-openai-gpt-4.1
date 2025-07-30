import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Test the ability of a member to create a new version (edit) of their own
 * comment.
 *
 * This test verifies the normal workflow for comment versioning by ordinary
 * members:
 *
 * 1. Create a member account that will own the comment.
 * 2. Create a parent post (simulate by using a random UUID since post creation is
 *    not in scope).
 * 3. As that member, create a new comment on the post.
 * 4. As the same member, create a new version of the comment, updating its
 *    content.
 * 5. Validate that the returned version record:
 *
 * - References the correct comment and editor (member id matches).
 * - The content matches the update payload.
 * - The created_at timestamp is valid and later than the comment creation time.
 * - The returned version id is unique and in UUID format.
 *
 * This covers the basic member edit/version scenario and confirms normal
 * revision-tracking flows work as intended.
 */
export async function test_api_discussionBoard_test_create_comment_version_as_member_success(
  connection: api.IConnection,
) {
  // 1. Create a board member (admin context)
  const now = new Date().toISOString();
  const memberUserIdentifier = RandomGenerator.alphabets(8) + "@test.com";
  const memberCreate = {
    user_identifier: memberUserIdentifier,
    joined_at: now,
  } satisfies IDiscussionBoardMember.ICreate;
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: memberCreate,
    },
  );
  typia.assert(member);

  // 2. Simulate a parent post by generating a random UUID
  const fakePostId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a new comment as the member (simulate switched context)
  const commentContent = RandomGenerator.paragraph()();
  const commentCreate = {
    discussion_board_member_id: member.id,
    discussion_board_post_id: fakePostId,
    content: commentContent,
  } satisfies IDiscussionBoardComment.ICreate;
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: commentCreate,
    },
  );
  typia.assert(comment);
  TestValidator.equals("comment author matches member")(
    comment.discussion_board_member_id,
  )(member.id);
  TestValidator.equals("comment post matches")(
    comment.discussion_board_post_id,
  )(fakePostId);
  TestValidator.equals("comment content matches")(comment.content)(
    commentContent,
  );

  // 4. Create a new version (edit) as this member (simulating editor is author)
  const updatedContent = commentContent + " (edited)";
  const versionCreate = {
    discussion_board_comment_id: comment.id,
    editor_member_id: member.id,
    content: updatedContent,
  } satisfies IDiscussionBoardCommentVersion.ICreate;
  const version =
    await api.functional.discussionBoard.member.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: versionCreate,
      },
    );
  typia.assert(version);
  TestValidator.equals("version's comment id matches")(
    version.discussion_board_comment_id,
  )(comment.id);
  TestValidator.equals("version author/editor matches")(
    version.editor_member_id,
  )(member.id);
  TestValidator.equals("version content matches update")(version.content)(
    updatedContent,
  );

  // 5. Validate time and format
  TestValidator.predicate("version creation after comment")(
    new Date(version.created_at).getTime() >=
      new Date(comment.created_at).getTime(),
  );
  // Confirm id is uuid
  TestValidator.predicate("version id is uuid format")(
    !!version.id && /^[0-9a-fA-F-]{36}$/.test(version.id),
  );
}
