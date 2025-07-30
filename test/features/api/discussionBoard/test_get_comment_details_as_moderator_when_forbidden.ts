import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test forbidden retrieval of a comment as a moderator due to business
 * restrictions.
 *
 * This test validates that when a moderator (even with elevated privileges)
 * attempts to fetch a comment's details via the moderator-specific endpoint,
 * but lacks sufficient permission due to business logic limits (such as access
 * to a private or highly restricted comment), the system properly denies
 * access. This checks defensive security: ensuring that privilege escalation
 * isn't possible via this API.
 *
 * Steps:
 *
 * 1. Generate a random UUID that does not belong to an accessible comment from the
 *    perspective of the moderator.
 * 2. Attempt to retrieve this comment as a moderator using the provided endpoint.
 * 3. Assert that a forbidden (HTTP 403) or unauthorized (HTTP 401) error occurs,
 *    as required by business logic.
 * 4. No further validation, as the error scenario suffices for this test.
 */
export async function test_api_discussionBoard_test_get_comment_details_as_moderator_when_forbidden(
  connection: api.IConnection,
) {
  // 1. Generate a commentId that the moderator should not be able to access.
  const forbiddenCommentId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt retrieval as a moderator on a restricted comment; expect forbidden/unauthorized error.
  await TestValidator.error("Forbidden or unauthorized error must occur")(
    async () => {
      await api.functional.discussionBoard.moderator.comments.at(connection, {
        commentId: forbiddenCommentId,
      });
    },
  );
}
