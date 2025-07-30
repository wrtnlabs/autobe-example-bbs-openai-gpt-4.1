import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Validates moderator error handling when creating a comment version for a
 * non-existent comment.
 *
 * This test ensures that when a moderator attempts to create (append) a new
 * version of a comment using a validly formatted but non-existent commentId,
 * the API responds with an appropriate error (typically a not found). This
 * prevents audit/version tables from including orphaned records and enforces
 * strict referential integrity. It also verifies proper error signaling for
 * moderation workflows involving missing or deleted entities.
 *
 * Test Workflow:
 *
 * 1. Create a new board member via the admin endpoint (who will act as the
 *    editor/moderator).
 * 2. Attempt to create a comment version as a moderator with a random UUID as
 *    commentId that does NOT exist.
 * 3. Confirm that the API correctly rejects the request (error is thrown), as
 *    expected.
 *
 * Edge Cases Considered:
 *
 * - Valid UUID that has never been associated with a comment
 * - Ensures error is properly thrown (not swallowed), but does not inspect error
 *   message/details
 *
 * Only business-implementable (runtime) validation is performed – it does not
 * attempt type system or invalid DTO structure errors.
 */
export async function test_api_discussionBoard_test_moderator_create_version_for_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Create (provision) a discussion board member who will act as moderator/editor
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Generate a random, valid, but non-existent comment UUID
  const nonexistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to create a comment version as moderator for the nonexistent commentId
  await TestValidator.error(
    "must not allow creating version for nonexistent comment",
  )(() =>
    api.functional.discussionBoard.moderator.comments.versions.create(
      connection,
      {
        commentId: nonexistentCommentId,
        body: {
          discussion_board_comment_id: nonexistentCommentId,
          editor_member_id: member.id,
          content: RandomGenerator.paragraph()(),
        },
      },
    ),
  );
}
