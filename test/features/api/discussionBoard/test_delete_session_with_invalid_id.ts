import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test deletion of a user session with an invalid or already deleted ID as
 * admin.
 *
 * This test checks the system's robust error handling when an admin attempts to
 * delete a user session using an invalid (non-existent) or already deleted
 * session ID. The intended outcome is that the system responds with a clear
 * error (such as HTTP 404 Not Found) and does not silently drop the request.
 *
 * Steps:
 *
 * 1. Generate a random UUID to act as an invalid or non-existent session ID.
 * 2. Attempt to delete a user session using this invalid ID.
 * 3. Validate that the system returns an error response (e.g., 404 Not Found),
 *    confirming the session does not exist and the delete operation is
 *    rejected.
 * 4. Repeat the delete operation with the same ID to simulate an already-deleted
 *    session and ensure the system behavior is consistent (should return the
 *    same error).
 */
export async function test_api_discussionBoard_test_delete_session_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for a session that (almost certainly) does not exist
  const invalidSessionId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to delete the non-existent session, expect an error
  await TestValidator.error(
    "Deleting session with invalid/non-existent ID should return error",
  )(async () => {
    await api.functional.discussionBoard.admin.userSessions.erase(connection, {
      userSessionId: invalidSessionId,
    });
  });

  // 3. Attempt to delete again (to simulate already-deleted ID), should also return an error
  await TestValidator.error(
    "Deleting session with already-deleted ID should return error",
  )(async () => {
    await api.functional.discussionBoard.admin.userSessions.erase(connection, {
      userSessionId: invalidSessionId,
    });
  });
}
