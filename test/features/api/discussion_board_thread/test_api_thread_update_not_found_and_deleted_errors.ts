import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";

/**
 * Validate error behavior when updating a non-existent or deleted
 * discussion board thread.
 *
 * This E2E test verifies that the thread update API correctly returns an
 * error when attempting to update a thread that does not exist. The error
 * check is performed using a random UUID that could not possibly refer to a
 * valid thread in the system. The scenario also intends to test the update
 * behavior for soft-deleted threads; however, since thread creation and
 * deletion APIs are unavailable, only the non-existent resource scenario is
 * implemented.
 *
 * Steps:
 *
 * 1. Register a user account (required for authentication).
 * 2. Attempt to update a thread with a random, non-existent UUID and capture
 *    the expected error.
 */
export async function test_api_thread_update_not_found_and_deleted_errors(
  connection: api.IConnection,
) {
  // 1. Register a new user for authentication context
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password@123";
  const username = RandomGenerator.name();
  const joinResp = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinResp);

  // 2. Attempt to update a non-existent thread ID (guaranteed random UUID)
  const fakeThreadId = typia.random<string & tags.Format<"uuid">>();
  const updateReq = {
    title: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IDiscussionBoardThread.IUpdate;
  await TestValidator.error(
    "Updating non-existent thread must result in a not found error",
    async () => {
      await api.functional.discussionBoard.user.threads.update(connection, {
        threadId: fakeThreadId,
        body: updateReq,
      });
    },
  );

  // 3. Attempting soft-deleted thread update is omitted due to unavailable endpoints.
}
