import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Test successful retrieval of a comment version by versionId and commentId as
 * an admin.
 *
 * This test validates that:
 *
 * 1. A member is created (the comment's author).
 * 2. A comment is created by that member for a given post.
 * 3. The comment is edited—creating a new version.
 * 4. As an admin, the test retrieves this specific comment version by both
 *    commentId and versionId.
 * 5. The full version content, editor/member info, and created timestamp are
 *    checked for correctness, ensuring audit and compliance metadata are
 *    present.
 *
 * Steps:
 *
 * 1. Register a discussion board member (admin endpoint).
 * 2. Create a new comment by the member (member endpoint).
 * 3. Append an edited version to the comment (member endpoint).
 * 4. Fetch the version by comment and version ID (admin endpoint).
 * 5. Assert all audit fields and content match the edit.
 */
export async function test_api_discussionBoard_test_get_comment_version_details_by_version_id_as_admin_success(
  connection: api.IConnection,
) {
  // 1. Create a member (author)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(10),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a comment by the member
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId,
        content: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);
  TestValidator.equals("author and member match")(
    comment.discussion_board_member_id,
  )(member.id);

  // 3. Edit the comment to create a new version
  const editContent = RandomGenerator.paragraph()();
  const version =
    await api.functional.discussionBoard.member.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: member.id,
          content: editContent,
        } satisfies IDiscussionBoardCommentVersion.ICreate,
      },
    );
  typia.assert(version);

  // 4. Retrieve the version as admin
  const fetched =
    await api.functional.discussionBoard.admin.comments.versions.at(
      connection,
      {
        commentId: comment.id,
        versionId: version.id,
      },
    );
  typia.assert(fetched);

  // 5. Validate the fetched version's details
  TestValidator.equals("version content matches")(fetched.content)(editContent);
  TestValidator.equals("version id matches")(fetched.id)(version.id);
  TestValidator.equals("editor id matches")(fetched.editor_member_id)(
    member.id,
  );
  TestValidator.equals("parent comment id matches")(
    fetched.discussion_board_comment_id,
  )(comment.id);
  TestValidator.predicate("created_at timestamp should be a string")(
    typeof fetched.created_at === "string",
  );
}
