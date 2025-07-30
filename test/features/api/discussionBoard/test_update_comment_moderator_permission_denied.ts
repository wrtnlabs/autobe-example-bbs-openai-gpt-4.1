import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate moderator update permission denial for unauthenticated sessions.
 *
 * This test ensures that updating a discussion board comment as a moderator
 * requires proper authentication. Attempts to edit a comment using a connection
 * lacking a valid token/session must be rejected by the API. It verifies that
 * access control is enforced by expecting a forbidden/unauthorized error (HTTP
 * 401/403). No comment should be updated without moderator/admin
 * authentication.
 *
 * Steps:
 *
 * 1. Simulate an unauthenticated/guest session by removing the Authorization
 *    header from the connection.
 * 2. Attempt to update a comment using the moderator endpoint with dummy data.
 * 3. Assert that the API call fails with an error due to permission denial,
 *    confirming robust authentication enforcement.
 */
export async function test_api_discussionBoard_test_update_comment_moderator_permission_denied(
  connection: api.IConnection,
) {
  // 1. Simulate guest/unauthenticated session: strip Authorization header
  const guestConnection = { ...connection, headers: { ...connection.headers } };
  delete guestConnection.headers["Authorization"];

  // 2. Prepare dummy comment UUID and update body input
  const dummyCommentId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    content: "Unauthorized update attempt",
  } satisfies IDiscussionBoardComment.IUpdate;

  // 3. Attempt moderator update: expect permission failure (401/403)
  await TestValidator.error("denied moderator update without authentication")(
    async () => {
      await api.functional.discussionBoard.moderator.comments.update(
        guestConnection,
        {
          commentId: dummyCommentId,
          body: updateBody,
        },
      );
    },
  );
}
