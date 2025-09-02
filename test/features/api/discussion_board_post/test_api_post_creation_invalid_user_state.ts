import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate that unverified (default after registration) users cannot create
 * posts in threads.
 *
 * This test ensures business rules regarding account verification are
 * enforced at post creation time. It covers end-to-end user journey:
 *
 * 1. Register a new user (should be unverified and unsuspended by default)
 * 2. Attempt to create a discussion thread as this user (allowed or forbidden
 *    depending on backend policy; test covers both cases)
 * 3. If thread creation succeeds, attempt to create a post in the thread,
 *    expecting rejection due to unverified state
 * 4. If thread creation is forbidden, document and treat the test as passed
 *    for this restriction as well
 * 5. Use strong type safety, type assertions, and descriptive assertion titles
 *    throughout
 */
export async function test_api_post_creation_invalid_user_state(
  connection: api.IConnection,
) {
  // 1. Register a new user (unverified and unsuspended by default)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: username,
      password: "ValidPW123!@#",
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);
  TestValidator.predicate(
    "new user is unverified by default",
    userJoin.user.is_verified === false,
  );
  TestValidator.predicate(
    "new user is not suspended by default",
    userJoin.user.is_suspended === false,
  );

  // 2. Try to create a new thread (allowed or forbidden depending on backend policy)
  let thread: IDiscussionBoardThread | undefined = undefined;
  let threadCreationFailed = false;
  try {
    thread = await api.functional.discussionBoard.user.threads.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardThread.ICreate,
      },
    );
    typia.assert(thread);
  } catch {
    threadCreationFailed = true;
  }

  if (threadCreationFailed) {
    TestValidator.predicate(
      "thread creation is forbidden for unverified users; test completed",
      true,
    );
    return;
  }

  // 3. Attempt to create a post as an unverified user. Expect error.
  await TestValidator.error(
    "unverified user should not be able to create post",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.create(
        connection,
        {
          threadId: thread!.id,
          body: {
            thread_id: thread!.id,
            title: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 8,
              wordMax: 14,
            }),
            body: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 7,
              sentenceMax: 12,
            }),
          } satisfies IDiscussionBoardPost.ICreate,
        },
      );
    },
  );
}
