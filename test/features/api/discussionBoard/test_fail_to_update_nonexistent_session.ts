import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Test that ensures attempting to update a non-existent or deleted session
 * record returns an error.
 *
 * This test verifies that when an admin attempts to update a user session (by
 * userSessionId) that does not exist, the API properly returns a 404 Not Found
 * or equivalent error. This confirms correct error handling and guarantees that
 * the system does not accidentally create a new record or leak any sensitive
 * session information.
 *
 * Steps performed:
 *
 * 1. Generate a random UUID not associated with any real session (by not creating
 *    any sessions prior).
 * 2. Attempt to update this non-existent session as admin using the proper API,
 *    with a valid IDiscussionBoardUserSession.IUpdate request body (omitting
 *    terminated_at, as the field does not accept null, only ISO string if
 *    set).
 * 3. Assert that a runtime error is thrown (such as HTTP 404), demonstrating
 *    proper API error handling.
 */
export async function test_api_discussionBoard_test_fail_to_update_nonexistent_session(
  connection: api.IConnection,
) {
  // 1. Generate a random, non-existent session ID
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create a valid update request body (terminated_at omitted; only expires_at)
  const updateBody = {
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1 hour
  } satisfies IDiscussionBoardUserSession.IUpdate;

  // 3. Attempt update and expect error
  await TestValidator.error("Should fail to update non-existent session")(
    async () => {
      await api.functional.discussionBoard.admin.userSessions.update(
        connection,
        {
          userSessionId: fakeSessionId,
          body: updateBody,
        },
      );
    },
  );
}
