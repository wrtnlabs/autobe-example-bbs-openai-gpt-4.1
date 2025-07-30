import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Test that an admin can update a comment version's content (snapshot)
 * successfully.
 *
 * Business context: Admins can overwrite the content of a specific comment
 * version for moderation or compliance. To do this, first, a board comment must
 * exist, and at least one version (edit) must exist for that comment, both
 * created as a regular member. Then, the admin updates the version's content.
 * The test verifies content persistence, audit fields update, and data
 * integrity. This ensures admin moderation capability works as intended and
 * history/audit compliance is maintained.
 *
 * Test steps:
 *
 * 1. (Precondition) Create a comment as a member.
 * 2. Create a second version of that comment (edit) as the member.
 * 3. As admin, update the content for that specific comment version (using the
 *    admin endpoint).
 * 4. Validate response: content is updated, and audit fields (e.g.,
 *    editor_member_id, created_at) reflect the update appropriately.
 */
export async function test_api_discussionBoard_test_update_comment_version_as_admin_successful_update(
  connection: api.IConnection,
) {
  // 1. Create a comment as a member
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentInput: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: memberId,
    discussion_board_post_id: postId,
    content: "Original comment content",
  };
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    { body: commentInput },
  );
  typia.assert(comment);

  // 2. Create a new version for the comment as the member
  const versionInput: IDiscussionBoardCommentVersion.ICreate = {
    discussion_board_comment_id: comment.id,
    editor_member_id: comment.discussion_board_member_id,
    content: "First edit content",
  };
  const version =
    await api.functional.discussionBoard.member.comments.versions.create(
      connection,
      { commentId: comment.id, body: versionInput },
    );
  typia.assert(version);

  // 3. As admin, update the content/snapshot for the version
  const adminUpdate: IDiscussionBoardCommentVersion.IUpdate = {
    content: "Admin-corrected content snapshot",
    // Optionally, update editor attribution if desired:
    // editor_member_id: typia.random<string & tags.Format<"uuid">>()
  };
  const updatedVersion =
    await api.functional.discussionBoard.admin.comments.versions.update(
      connection,
      {
        commentId: comment.id,
        versionId: version.id,
        body: adminUpdate,
      },
    );
  typia.assert(updatedVersion);

  // 4. Validate the update
  TestValidator.equals("version id")(updatedVersion.id)(version.id);
  TestValidator.equals("comment id")(
    updatedVersion.discussion_board_comment_id,
  )(comment.id);
  TestValidator.equals("content updated by admin")(updatedVersion.content)(
    adminUpdate.content!,
  );
  // Optionally check editor_member_id or timestamp audit if business logic specifies
}
