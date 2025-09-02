import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";

/**
 * End-to-end permission and validation tests for updating discussion board
 * threads.
 *
 * This test validates that:
 *
 * - A thread owner (User A) can update their thread (title, is_locked,
 *   is_archived)
 * - Another user (User B) cannot update User A's thread (permission denied
 *   error)
 * - Updating a thread title to a value already used by another thread fails
 *   with a unique constraint validation error
 * - Invalid data (empty/too long title, wrong types, etc.) fails validation
 * - The response reflects correct updated fields and an updated 'updated_at'
 *   timestamp
 *
 * Steps:
 *
 * 1. Register User A and login
 * 2. Create Thread X as User A (using update as surrogate for creation since
 *    only update API is available)
 * 3. Register User B and login as User B
 * 4. Attempt to update Thread X as User B (should fail with permission error)
 * 5. Switch to User A and create Thread Y (second thread, for duplicate title
 *    check)
 * 6. Attempt to update Thread X (owned by A) to Thread Y's title (should fail
 *    due to duplicate title constraint)
 * 7. Try additional invalid updates (empty/too long title, wrong field types)
 *    – expect validation errors
 * 8. Update Thread X with valid new fields as User A (change title to unique,
 *    toggle is_locked/is_archived)
 * 9. Verify response: correct updates and updated_at is more recent
 * 10. Ensure User B cannot update Thread X post-modification
 */
export async function test_api_thread_update_by_owner_and_others_permission(
  connection: api.IConnection,
) {
  // 1. Register User A
  const userA_email = typia.random<string & tags.Format<"email">>();
  const userA_username = RandomGenerator.alphaNumeric(12);
  const userA_password = "Aa1!" + RandomGenerator.alphaNumeric(10); // meets password policy
  const userA: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userA_email,
        username: userA_username,
        password: userA_password,
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(userA);

  // 2. Create Thread X as User A -- workaround: simulate thread as update
  // Since we don't have a "create thread" endpoint, simulate with update using random uuid.
  const threadX_id = typia.random<string & tags.Format<"uuid">>();
  // Let User A "own" this thread (simulate creation via update, as no create/list APIs exist)
  const threadX_title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const initialX: IDiscussionBoardThread =
    await api.functional.discussionBoard.user.threads.update(connection, {
      threadId: threadX_id,
      body: {
        title: threadX_title,
        is_locked: false,
        is_archived: false,
      } satisfies IDiscussionBoardThread.IUpdate,
    });
  typia.assert(initialX);
  TestValidator.equals(
    "thread created with correct title (X)",
    initialX.title,
    threadX_title,
  );
  TestValidator.equals(
    "thread created has is_locked false (X)",
    initialX.is_locked,
    false,
  );
  TestValidator.equals(
    "thread created has is_archived false (X)",
    initialX.is_archived,
    false,
  );
  const threadX_created_at = initialX.created_at;
  const threadX_updated_at_before = initialX.updated_at;

  // 3. Register User B and login
  const userB_email = typia.random<string & tags.Format<"email">>();
  const userB_username = RandomGenerator.alphaNumeric(12);
  const userB_password = "Bb2!" + RandomGenerator.alphaNumeric(10);
  const userB: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userB_email,
        username: userB_username,
        password: userB_password,
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(userB);

  // 4. Login as User B and attempt to update Thread X (should fail)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userB_email,
      password: userB_password,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  await TestValidator.error(
    "User B cannot update User A's thread (permission denied)",
    async () => {
      await api.functional.discussionBoard.user.threads.update(connection, {
        threadId: threadX_id,
        body: {
          title: RandomGenerator.name(3),
        } satisfies IDiscussionBoardThread.IUpdate,
      });
    },
  );

  // 5. Login as User A (for further operations)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userA_email,
      password: userA_password,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 6. Create Thread Y as User A (for duplicate title check, using update as surrogate)
  const threadY_id = typia.random<string & tags.Format<"uuid">>();
  const threadY_title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const initialY: IDiscussionBoardThread =
    await api.functional.discussionBoard.user.threads.update(connection, {
      threadId: threadY_id,
      body: {
        title: threadY_title,
        is_locked: false,
        is_archived: false,
      } satisfies IDiscussionBoardThread.IUpdate,
    });
  typia.assert(initialY);

  // 7. Attempt to update Thread X's title to duplicate (Thread Y's title) - expect unique constraint error
  await TestValidator.error(
    "Cannot update thread title to duplicate (unique constraint)",
    async () => {
      await api.functional.discussionBoard.user.threads.update(connection, {
        threadId: threadX_id,
        body: { title: threadY_title } satisfies IDiscussionBoardThread.IUpdate,
      });
    },
  );

  // 8. Try invalid thread updates (invalid titles, types) - expect validation errors
  // 8.1 Empty title
  await TestValidator.error(
    "Cannot update thread with empty title",
    async () => {
      await api.functional.discussionBoard.user.threads.update(connection, {
        threadId: threadX_id,
        body: { title: "" } satisfies IDiscussionBoardThread.IUpdate,
      });
    },
  );
  // 8.2 Too long title (simulate max length > 200 chars, if enforced)
  await TestValidator.error(
    "Cannot update thread with excessively long title",
    async () => {
      await api.functional.discussionBoard.user.threads.update(connection, {
        threadId: threadX_id,
        body: {
          title: RandomGenerator.alphaNumeric(256),
        } satisfies IDiscussionBoardThread.IUpdate,
      });
    },
  );
  // 8.3 Bad types (simulate by passing string for boolean)
  await TestValidator.error(
    "Cannot update thread with wrong type for is_locked",
    async () => {
      await api.functional.discussionBoard.user.threads.update(connection, {
        threadId: threadX_id,
        body: { is_locked: "yes" } as any, // Expect runtime validation error, not compilation error
      });
    },
  );

  // 9. Update Thread X with valid new fields
  const newTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 10,
  });
  const updated: IDiscussionBoardThread =
    await api.functional.discussionBoard.user.threads.update(connection, {
      threadId: threadX_id,
      body: {
        title: newTitle,
        is_locked: true,
        is_archived: true,
      } satisfies IDiscussionBoardThread.IUpdate,
    });
  typia.assert(updated);
  TestValidator.equals("thread title updated (X)", updated.title, newTitle);
  TestValidator.equals("is_locked updated (X)", updated.is_locked, true);
  TestValidator.equals("is_archived updated (X)", updated.is_archived, true);
  TestValidator.predicate(
    "updated_at has changed after update (X)",
    updated.updated_at > threadX_updated_at_before,
  );

  // 10. Switch to User B and verify still cannot update Thread X post-modification
  await api.functional.auth.user.login(connection, {
    body: {
      email: userB_email,
      password: userB_password,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  await TestValidator.error(
    "User B still cannot update thread (permission denied after update)",
    async () => {
      await api.functional.discussionBoard.user.threads.update(connection, {
        threadId: threadX_id,
        body: {
          title: RandomGenerator.name(2),
        } satisfies IDiscussionBoardThread.IUpdate,
      });
    },
  );
}
