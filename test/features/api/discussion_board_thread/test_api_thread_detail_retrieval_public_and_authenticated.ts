import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";

/**
 * E2E test for retrieving discussion board thread details as both an
 * unauthenticated visitor and an authenticated user.
 *
 * This test ensures any non-deleted thread can be accessed publicly by
 * threadId, and that authenticated users see the same data as visitors. It
 * also verifies that attempting to view a soft-deleted or non-existent
 * thread results in a not found error.
 *
 * Steps:
 *
 * 1. Register a new user for the authenticated context (dependency).
 * 2. Generate a test thread UUID and ensure this thread can be fetched as a
 *    visitor.
 * 3. Log in as the registered user.
 * 4. Fetch the same thread as the authenticated user and ensure all details
 *    match the visitor detail.
 * 5. Attempt to fetch a soft-deleted thread (threadId exists, but deleted_at
 *    is set), expecting a not found.
 * 6. Attempt to fetch a non-existent thread (random UUID), expecting a not
 *    found.
 */
export async function test_api_thread_detail_retrieval_public_and_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a user (dependency)
  const userCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12) + "aA!",
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const registered = await api.functional.auth.user.join(connection, {
    body: userCreate,
  });
  typia.assert(registered);

  // 2. Choose/generate a test thread UUID not soft-deleted (mock scenario due to API limitations)
  const threadId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Try to fetch as visitor (connection should have no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const visitorThread = await api.functional.discussionBoard.threads.at(
    unauthConn,
    { threadId },
  );
  typia.assert(visitorThread);
  TestValidator.predicate(
    "visitor thread not soft-deleted",
    visitorThread.deleted_at === null || visitorThread.deleted_at === undefined,
  );
  TestValidator.predicate(
    "required visitor thread fields present",
    !!visitorThread.id &&
      !!visitorThread.title &&
      !!visitorThread.created_by_id &&
      !!visitorThread.created_at &&
      !!visitorThread.updated_at,
  );

  // 3. Log in as the user (token managed automatically by api.functional.auth.user.join)
  // Fetch as authenticated user (connection will now have Authorization header)
  const userThread = await api.functional.discussionBoard.threads.at(
    connection,
    { threadId },
  );
  typia.assert(userThread);
  TestValidator.equals(
    "thread detail matches for visitor and user",
    visitorThread,
    userThread,
  );

  // 4. Edge case: Try fetching a soft-deleted thread (simulate by providing a UUID and expecting not found)
  const fakeSoftDeletedId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to fetch soft-deleted thread (404)",
    async () => {
      await api.functional.discussionBoard.threads.at(unauthConn, {
        threadId: fakeSoftDeletedId,
      });
    },
  );

  // 5. Edge case: Try fetching a non-existent thread
  const nonExistentThreadId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to fetch non-existent thread (404)",
    async () => {
      await api.functional.discussionBoard.threads.at(unauthConn, {
        threadId: nonExistentThreadId,
      });
    },
  );
}
