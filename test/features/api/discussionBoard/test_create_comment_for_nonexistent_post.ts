import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test that creating a comment for a non-existent post is not allowed.
 *
 * Business context:
 *
 * - Comments must refer to an existing discussion board post.
 * - The system must enforce referential integrity, preventing orphaned comments.
 *
 * This test ensures that if a client (even a valid member) attempts to create a
 * comment pointing to a post UUID that does not exist, the system rejects the
 * request with an error response (maintaining database integrity and
 * application logic).
 *
 * Steps:
 *
 * 1. Generate a random UUID to serve as the non-existent post ID (guaranteed to
 *    not match any real post).
 * 2. Generate a random member UUID as the comment creator (simulating proper
 *    authenticated context).
 * 3. Prepare the comment creation request body with these values and realistic
 *    content.
 * 4. Attempt to create the comment via API.
 * 5. Validate that an error is thrown, confirming the referential integrity check
 *    prevents the operation.
 */
export async function test_api_discussionBoard_test_create_comment_for_nonexistent_post(
  connection: api.IConnection,
) {
  // 1. Use random UUID as the post ID (guaranteed not to exist)
  const nonExistentPostId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Generate a random member ID (test principal, simulating authentication context)
  const fakeMemberId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare comment creation request with these values
  const createBody: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: fakeMemberId,
    discussion_board_post_id: nonExistentPostId,
    content: RandomGenerator.paragraph()(),
  };
  // 4. Attempt to create – expect error (referential integrity violation)
  await TestValidator.error("should fail when referring to nonexistent post")(
    () =>
      api.functional.discussionBoard.member.comments.create(connection, {
        body: createBody,
      }),
  );
}
