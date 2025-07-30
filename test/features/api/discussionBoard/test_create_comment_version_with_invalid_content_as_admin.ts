import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Validates that the system rejects invalid comment version creations by admin
 * (empty/too-long content).
 *
 * This test verifies that an administrator cannot create a new version (edit)
 * for a board comment with an invalid 'content' field (e.g., empty or exceeding
 * length policy). The test ensures that field-level validation is enforced
 * equally for admins and non-admins.
 *
 * 1. Admin creates a new member who will author the initial comment
 * 2. That member creates a real comment for a random post
 * 3. Admin attempts to create a version with empty string as content (should
 *    trigger validation error)
 * 4. Admin attempts to create a version with excessively long string as content
 *    (should trigger validation error)
 *
 * Both error cases are validated with TestValidator.error. This confirms
 * business rules around comment content integrity are enforced system-wide,
 * even for privileged users.
 */
export async function test_api_discussionBoard_test_create_comment_version_with_invalid_content_as_admin(
  connection: api.IConnection,
) {
  // 1. Admin creates a new member (serves as "real" comment author)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphabets(10),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Member creates a comment for a random post
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId,
        content: "Initial comment for testing version validation.",
      },
    },
  );
  typia.assert(comment);

  // 3. Admin attempts to create a comment version with empty content
  await TestValidator.error("admin cannot create version with empty content")(
    () =>
      api.functional.discussionBoard.admin.comments.versions.create(
        connection,
        {
          commentId: comment.id,
          body: {
            discussion_board_comment_id: comment.id,
            editor_member_id: member.id,
            content: "",
          },
        },
      ),
  );

  // 4. Admin attempts to create a comment version with content exceeding allowed length
  const excessiveLength = 10000; // Use a very long content (business rule for max not given, simulate extreme)
  await TestValidator.error(
    "admin cannot create version with content exceeding max length",
  )(() =>
    api.functional.discussionBoard.admin.comments.versions.create(connection, {
      commentId: comment.id,
      body: {
        discussion_board_comment_id: comment.id,
        editor_member_id: member.id,
        content: "A".repeat(excessiveLength),
      },
    }),
  );
}
