import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Validate that a moderator can successfully update a specific comment version.
 *
 * This test ensures that a moderator can overwrite/edit the snapshot of a
 * discussion comment version for compliance or moderation purposes, given:
 *
 * - A member has created a comment
 * - At least one version exists for the comment The moderator should be able to
 *   update the version's content and the change must be reflected in the
 *   returned updated version object, including relevant audit fields.
 *
 * Steps:
 *
 * 1. Create a member comment (using member credentials).
 * 2. Create a new version for that comment (using member credentials for editor
 *    attribution).
 * 3. Update the version as a moderator (change the content and optionally editor
 *    attribution).
 * 4. Verify the updated content and editor attribution (if changed) are reflected
 *    correctly.
 * 5. Optionally verify the audit 'created_at' remains unchanged.
 */
export async function test_api_discussionBoard_test_update_comment_version_as_moderator_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a member comment
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content: "First comment content " + RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 2. Create a version as the member
  const version =
    await api.functional.discussionBoard.member.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: memberId,
          content: "Edited version content " + RandomGenerator.paragraph()(),
        } satisfies IDiscussionBoardCommentVersion.ICreate,
      },
    );
  typia.assert(version);

  // 3. Update the version as moderator (simulate with new content & optionally editor attribution override)
  const newContent = "[Moderated] " + RandomGenerator.paragraph()();
  const updateInput: IDiscussionBoardCommentVersion.IUpdate = {
    content: newContent,
    // Optionally re-attribute editor by providing editor_member_id here if required
  };
  const updatedVersion =
    await api.functional.discussionBoard.moderator.comments.versions.update(
      connection,
      {
        commentId: comment.id,
        versionId: version.id,
        body: updateInput,
      },
    );
  typia.assert(updatedVersion);

  // 4. Confirm: content is updated, version id unchanged, created_at unchanged
  TestValidator.equals("version id unchanged")(updatedVersion.id)(version.id);
  TestValidator.equals("parent comment matches")(
    updatedVersion.discussion_board_comment_id,
  )(comment.id);
  TestValidator.equals("content is updated")(updatedVersion.content)(
    newContent,
  );
  TestValidator.equals("created_at unchanged")(updatedVersion.created_at)(
    version.created_at,
  );
}
