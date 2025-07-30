import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Validates that an admin can create a version (edit) for any comment,
 * demonstrating administrative audit/override support.
 *
 * This test ensures that:
 *
 * - An admin can create a member.
 * - The member can post a comment.
 * - The admin can create an edit/version of the member's comment, specifying
 *   content and an editor.
 * - The version is created with the admin as editor and with proper metadata,
 *   reflecting the change in version history.
 * - The data integrity is maintained, and all identifiers and timestamps are
 *   valid.
 *
 * Steps:
 *
 * 1. Create a discussion board member (will serve as the original comment author).
 * 2. Create a comment authored by that member.
 * 3. Create a second member to serve as admin/editor (simulate admin or
 *    moderator).
 * 4. As admin, create a new version for the comment, using the admin as the
 *    editor.
 * 5. Assert the returned version record's fields (comment linkage, editor ID, new
 *    content, audit timestamp).
 *
 * This validates admin-level controls and compliance-oriented version tracking
 * for moderation or correction use cases.
 */
export async function test_api_discussionBoard_test_create_comment_version_as_admin_success(
  connection: api.IConnection,
) {
  // 1. Create a discussion board member (comment author)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a discussion board comment by that member (simulate post context as random UUID)
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

  // 3. Create another member to act as admin/editor
  const admin = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(admin);

  // 4. Admin creates a new version for the comment
  const newContent = RandomGenerator.paragraph()();
  const version =
    await api.functional.discussionBoard.admin.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: admin.id,
          content: newContent,
        } satisfies IDiscussionBoardCommentVersion.ICreate,
      },
    );
  typia.assert(version);

  // 5. Assert the returned version record's correctness
  TestValidator.equals("version.comment linkage")(
    version.discussion_board_comment_id,
  )(comment.id);
  TestValidator.equals("version editor")(version.editor_member_id)(admin.id);
  TestValidator.equals("version content")(version.content)(newContent);
  TestValidator.predicate("version.created_at is ISO8601")(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?/.test(version.created_at),
  );
  TestValidator.equals("version.id is uuid")(
    typeof version.id === "string" &&
      version.id.length > 0 &&
      /[0-9a-f-]+/.test(version.id),
  )(true);
}
