import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate that a member cannot access another member's comment that is
 * protected by permissions or privacy settings.
 *
 * This test simulates a member attempting to fetch a comment created by a
 * different member. According to access control policy, such a request should
 * be denied, resulting in either a forbidden (403) or not found (404) error
 * response. As comment/member creation flows are not available in the API/DTO
 * inputs, a random commentId is used to simulate a non-owned or inaccessible
 * comment.
 *
 * Step-by-step process:
 *
 * 1. Generate the ID of a comment presumed to belong to another member (simulate
 *    with random UUID)
 * 2. Attempt to retrieve this comment using the SDK function as the caller member
 * 3. Expect the API to throw a forbidden or not found error, and assert this using
 *    TestValidator.error
 */
export async function test_api_discussionBoard_test_get_other_member_comment_access_denied(
  connection: api.IConnection,
) {
  // 1. Simulate a foreign comment ID (presume it belongs to another member, not the caller)
  const foreignCommentId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to fetch the comment, expecting access denial
  await TestValidator.error("Access to another member's comment is denied")(
    async () => {
      await api.functional.discussionBoard.member.comments.at(connection, {
        commentId: foreignCommentId,
      });
    },
  );
}
