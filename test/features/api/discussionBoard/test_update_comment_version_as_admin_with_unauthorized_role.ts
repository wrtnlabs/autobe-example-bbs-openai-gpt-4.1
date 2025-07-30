import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Validate that a non-admin/non-moderator (e.g., ordinary member) is denied
 * access when trying to use the admin endpoint to update a comment version.
 *
 * This checks proper authorization enforcement for the staff-only version
 * update feature. Only admins/mods should be able to update comment versions
 * through this endpoint. A member or guest should NOT be able to.
 *
 * 1. Prepare test as an ordinary member (no admin/mod privileges).
 * 2. Create a new board comment as a member, using the member API.
 * 3. Add a version to the comment as the same member, using the member API.
 * 4. Attempt to update the comment version as a member or guest, using the admin
 *    endpoint.
 * 5. Confirm that an authorization error is thrown or proper error status is
 *    returned (e.g., 401/403), indicating insufficient permissions.
 */
export async function test_api_discussionBoard_test_update_comment_version_as_admin_with_unauthorized_role(
  connection: api.IConnection,
) {
  // 1. Simulate an ordinary member account (not staff/admin/moderator)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create base comment as member
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content: "This is a test comment by a non-admin member.",
      },
    },
  );
  typia.assert(comment);

  // 3. Create a version of the comment as the same member
  const commentVersion =
    await api.functional.discussionBoard.member.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: memberId,
          content: "Edited content (version 2)",
        },
      },
    );
  typia.assert(commentVersion);

  // 4. Attempt to update this version using the admin endpoint as the non-admin
  await TestValidator.error("Unauthorized update by member should fail")(
    async () => {
      await api.functional.discussionBoard.admin.comments.versions.update(
        connection,
        {
          commentId: comment.id,
          versionId: commentVersion.id,
          body: {
            content: "Modified by member using admin endpoint (should fail)",
          },
        },
      );
    },
  );
}
