import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Verify that only accounts with moderator/admin privileges can update a
 * comment version via the moderator endpoint.
 *
 * Business context: Ordinary users (members) should not be able to perform
 * moderator actions such as updating the version history of a comment through
 * staff endpoints. This test ensures that privilege boundaries are respected by
 * the backend, enforcing role-based authorization.
 *
 * Workflow:
 *
 * 1. Simulate a member creating a comment on a post with valid data.
 * 2. The same member creates a version (edit snapshot) for the comment.
 * 3. Simulate a session for a non-privileged (regular/member) user—one that is not
 *    a moderator or admin.
 * 4. Attempt to update the version of the comment via the moderator-specific
 *    endpoint with the non-privileged session.
 * 5. Expect the operation to fail with a forbidden/authorization error.
 *
 * This test ensures there is a defense-in-depth boundary so that only
 * privileged roles can access moderation APIs.
 */
export async function test_api_discussionBoard_test_update_comment_version_as_moderator_without_permission(
  connection: api.IConnection,
) {
  // 1. Create a new comment as a member. Assume the initial connection is authenticated as a member.
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: "Initial member comment content.",
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 2. Create a new version for this comment as the (authorized) member.
  const version =
    await api.functional.discussionBoard.member.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: comment.discussion_board_member_id,
          content: "First edit from the member.",
        } satisfies IDiscussionBoardCommentVersion.ICreate,
      },
    );
  typia.assert(version);

  // 3. Simulate a different, non-privileged member's session.
  // In a real environment, this would be a different login; here we use a new UUID and assume the connection context represents a non-moderator.
  const nonPrivilegedMemberId = typia.random<string & tags.Format<"uuid">>();

  // 4. Attempt to update the comment version as the non-moderator. This should be forbidden.
  await TestValidator.error(
    "Non-moderator should be forbidden from updating a comment version",
  )(async () => {
    await api.functional.discussionBoard.moderator.comments.versions.update(
      connection,
      {
        commentId: comment.id,
        versionId: version.id,
        body: {
          content: "Malicious update by non-privileged user",
          editor_member_id: nonPrivilegedMemberId,
        } satisfies IDiscussionBoardCommentVersion.IUpdate,
      },
    );
  });
}
