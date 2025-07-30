import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Validate that the admin API properly returns a not found error when
 * attempting to retrieve a non-existent comment version for a given valid
 * comment.
 *
 * This test ensures correct error handling by simulating the following steps:
 *
 * 1. Admin provisions a board member (creates an account)
 * 2. Member posts a new comment (as discussion board content)
 * 3. Member adds a new version to the comment (editing content/history)
 * 4. Admin attempts to fetch a comment version using a random or deleted versionId
 *    that definitely does not exist for the comment (not the initial version,
 *    not any real one)
 * 5. The API should respond with a not found error (verifying system error
 *    handling)
 *
 * Edge Cases:
 *
 * - Attempts with random UUIDs that could never have existed.
 * - (Test does NOT try to create then delete a version, as deletion API is not
 *   exposed.)
 * - Only business-valid simulated not-found is checked (no type errors/validation
 *   errors).
 *
 * Success Criteria:
 *
 * - API call fails with correct HTTP error (typically 404 or domain-specific not
 *   found).
 * - The error is thrown and handled as an expected outcome of querying a
 *   non-existent resource.
 */
export async function test_api_discussionBoard_test_get_comment_version_not_found_error(
  connection: api.IConnection,
) {
  // 1. Admin provisions a board member
  const now = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphabets(12),
        joined_at: now,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Member posts a new comment
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.content()()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Member adds a new version to the comment
  const version =
    await api.functional.discussionBoard.member.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: member.id,
          content: RandomGenerator.content()()(),
        } satisfies IDiscussionBoardCommentVersion.ICreate,
      },
    );
  typia.assert(version);

  // 4. Admin attempts to fetch a comment version with a non-existent versionId
  const fakeVersionId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.error("should throw not found for missing version")(
    async () => {
      await api.functional.discussionBoard.admin.comments.versions.at(
        connection,
        {
          commentId: comment.id,
          versionId: fakeVersionId,
        },
      );
    },
  );
}
