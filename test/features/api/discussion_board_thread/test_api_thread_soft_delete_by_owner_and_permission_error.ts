import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IPageIDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Tests soft-deletion of threads by owner, forbidden deletion by other
 * user, idempotence, and not-found for non-existent threads.
 *
 * Steps:
 *
 * 1. Register UserA, log in
 * 2. List threads to find a thread owned by UserA (or skip test if none)
 * 3. Delete (soft-delete) that thread as UserA
 * 4. List/search threads - confirm thread is omitted (confirm not in result)
 * 5. Register UserB, log in
 * 6. Attempt to delete UserA's (already-soft-deleted) thread as UserB – must
 *    fail (permission denied)
 * 7. Attempt to delete a random UUID as non-existent thread (must get not
 *    found error)
 * 8. Attempt to delete already deleted thread as UserA again – must be
 *    idempotent (no error or defined error)
 */
export async function test_api_thread_soft_delete_by_owner_and_permission_error(
  connection: api.IConnection,
) {
  // 1. Register UserA
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAUsername = RandomGenerator.name();
  const userAPassword = "StrongPwd123$";

  const userAAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      username: userAUsername,
      password: userAPassword,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAAuth);
  const userAId = userAAuth.user.id;

  // 2. List threads owned by UserA
  const threadListing = await api.functional.discussionBoard.threads.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        created_by_id: userAId,
      } satisfies IDiscussionBoardThread.IRequest,
    },
  );
  typia.assert(threadListing);
  const threads = threadListing.data;

  TestValidator.predicate(
    "UserA has at least one thread to delete",
    threads.length > 0,
  );

  const threadId = threads[0].id;

  // 3. UserA soft-deletes their own thread
  await api.functional.discussionBoard.user.threads.erase(connection, {
    threadId,
  });

  // 4. List again to confirm thread is omitted
  const threadListingAfterDelete =
    await api.functional.discussionBoard.threads.index(connection, {
      body: {
        page: 1,
        limit: 10,
        created_by_id: userAId,
      } satisfies IDiscussionBoardThread.IRequest,
    });
  typia.assert(threadListingAfterDelete);
  TestValidator.predicate(
    "Soft-deleted thread is omitted from listing",
    !threadListingAfterDelete.data.some((th) => th.id === threadId),
  );

  // 5. Register UserB, log in
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBUsername = RandomGenerator.name();
  const userBPassword = "AnotherStrongPwd!12";
  const userBAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      username: userBUsername,
      password: userBPassword,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userBAuth);

  // 6. UserB attempts to delete UserA's thread – should get permission error
  await TestValidator.error(
    "UserB cannot delete a thread they do not own",
    async () => {
      await api.functional.discussionBoard.user.threads.erase(connection, {
        threadId,
      });
    },
  );

  // 7. Attempt to delete non-existent thread id
  const randomThreadId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting non-existent thread should throw not found",
    async () => {
      await api.functional.discussionBoard.user.threads.erase(connection, {
        threadId: randomThreadId,
      });
    },
  );

  // 8. UserA logs back in and attempts to delete the already-soft-deleted thread again (idempotent)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  await api.functional.discussionBoard.user.threads.erase(connection, {
    threadId,
  });
}
