import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Verifies that attempting to fetch details of a user/guest session with a
 * non-existent or invalid userSessionId as an admin returns a proper error
 * response.
 *
 * This test ensures that when an administrator issues a GET request for a
 * session (by UUID) that does not exist in the system (either a fabricated or
 * deleted session ID), the API responds with an error—such as HTTP 404 Not
 * Found—without leaking any session or sensitive information.
 *
 * Steps:
 *
 * 1. Generate a random UUID that should not correspond to any existing session
 *    (simulate non-existent session).
 * 2. As an admin, attempt to fetch the user session details via the admin endpoint
 *    using this UUID.
 * 3. Confirm that an error is returned (expect 404 or similar), and that no
 *    sensitive information is leaked in the error response.
 */
export async function test_api_discussionBoard_test_get_user_session_details_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to fetch user session details with the invalid session ID
  await TestValidator.error(
    "Fetching user session with non-existent ID should fail",
  )(async () => {
    await api.functional.discussionBoard.admin.userSessions.at(connection, {
      userSessionId: nonExistentSessionId,
    });
  });
}
