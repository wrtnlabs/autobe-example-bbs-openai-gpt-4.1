import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Verify that unauthenticated users (guests) are denied permission to create comments on the discussion board.
 *
 * Business context:
 * Discussion board comments may only be posted by authenticated members. Guests (users without authentication tokens) must receive an authorization error (e.g., 401 Unauthorized or 403 Forbidden) when making API requests to create a comment. This test ensures that proper permission enforcement is in place to prevent anonymous commenting, maintaining forum integrity and accountability.
 *
 * Steps:
 * 1. Prepare a test connection that represents an unauthenticated guest (no Authorization header or token attached).
 * 2. Construct a valid comment creation request body using random but valid data for discussion_board_post_id and body (parent_id can be omitted or null).
 * 3. Attempt to create a comment as a guest using API call.
 * 4. Confirm that the API call fails with an authentication/authorization error. The error must occur at runtime, not as a compile-time type error, and should not return a successful comment record.
 */
export async function test_api_discussionBoard_test_create_comment_by_guest_rejected_due_to_permissions(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection (no additional headers set)

  // 2. Build a valid comment creation request body
  const commentBody: IDiscussionBoardComment.ICreate = {
    discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
    body: "This is an attempt by a guest user.",
    // parent_id: optional; skipping for top-level comment
  };

  // 3. Attempt to create a comment as a guest. This should result in a permission error.
  await TestValidator.error("guest cannot create comment")(async () => {
    await api.functional.discussionBoard.comments.post(connection, {
      body: commentBody,
    });
  });
}