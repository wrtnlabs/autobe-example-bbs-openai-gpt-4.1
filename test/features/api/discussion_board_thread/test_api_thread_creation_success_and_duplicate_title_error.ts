import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";

/**
 * Test thread creation and duplicate title constraint for a discussion
 * board.
 *
 * 1. Register a new discussion board user (join, with unique email/username).
 * 2. As the authenticated user, create a new thread with a unique title.
 * 3. Check the returned thread's title, ownership, and default status fields
 *    (is_locked, is_archived).
 * 4. Attempt to create another thread with the same title under the same user,
 *    expect a duplicate-title error.
 * 5. (Negative/documented only) Confirm that non-verified/suspended users
 *    cannot create threads (edge: not implementable here).
 */
export async function test_api_thread_creation_success_and_duplicate_title_error(
  connection: api.IConnection,
) {
  // 1. Register new user with unique email, username, consent
  const userReg: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name().replace(/\s+/g, "_").slice(0, 24),
        password: RandomGenerator.alphaNumeric(12) + "A!1", // force uppercase/number/special char
        display_name: RandomGenerator.name(),
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(userReg);
  const userId: string = userReg.user.id;

  // 2. Authenticated: create thread with unique title
  const threadTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 6,
    wordMax: 12,
  });
  const newThread: IDiscussionBoardThread =
    await api.functional.discussionBoard.user.threads.create(connection, {
      body: {
        title: threadTitle,
      } satisfies IDiscussionBoardThread.ICreate,
    });
  typia.assert(newThread);
  TestValidator.equals("thread title matches", newThread.title, threadTitle);
  TestValidator.equals(
    "thread creator matches user",
    newThread.created_by_id,
    userId,
  );
  TestValidator.equals(
    "thread is unlocked by default",
    newThread.is_locked,
    false,
  );
  TestValidator.equals(
    "thread is unarchived by default",
    newThread.is_archived,
    false,
  );

  // 3. Attempt to create duplicate titled thread under same user, expect error
  await TestValidator.error(
    "duplicate thread title should yield error",
    async () => {
      await api.functional.discussionBoard.user.threads.create(connection, {
        body: {
          title: threadTitle,
        } satisfies IDiscussionBoardThread.ICreate,
      });
    },
  );

  // 4. (Future) Non-verified and suspended users forbidden: no endpoints to simulate, so not implemented.
}
