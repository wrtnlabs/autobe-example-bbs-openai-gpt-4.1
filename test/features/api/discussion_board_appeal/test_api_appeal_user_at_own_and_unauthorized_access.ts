import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * Validate per-user appeal retrieval, cross-user security, and not found
 * case.
 *
 * This test ensures (1) a user can retrieve the details of their own appeal
 * submission, (2) another user cannot access this appeal (access denied or
 * not found), and (3) an invalid/nonexistent appeal id yields an
 * appropriate error.
 *
 * Steps:
 *
 * 1. Register two users (User 1 and User 2)
 * 2. User 1 submits a new appeal and receives the corresponding appeal id
 * 3. User 1 retrieves their own appeal by id (should succeed; validate full
 *    detail)
 * 4. Switch to User 2 using login
 * 5. User 2 attempts to retrieve the same appeal id (must fail: denied or not
 *    found)
 * 6. User 2 attempts to retrieve a random/nonexisting appeal id (must fail:
 *    not found)
 */
export async function test_api_appeal_user_at_own_and_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register User 1
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.name(1) + RandomGenerator.alphabets(4);
  const user1Password = "Abcd!12345xx";
  const user1Auth = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Username,
      password: user1Password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1Auth);
  const user1Id = user1Auth.user.id;

  // 2. Register User 2
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name(1) + RandomGenerator.alphabets(4);
  const user2Password = "Qwer!09876zz";
  const user2Auth = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: user2Password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2Auth);
  const user2Id = user2Auth.user.id;

  // 3. User 1 submits an appeal
  // User1 context already present (from join)
  const appealReason = RandomGenerator.paragraph({ sentences: 5 });
  const createdAppeal =
    await api.functional.discussionBoard.user.appeals.create(connection, {
      body: {
        appellant_id: user1Id,
        appeal_reason: appealReason,
      } satisfies IDiscussionBoardAppeal.ICreate,
    });
  typia.assert(createdAppeal);
  TestValidator.equals(
    "appeal appellant should match user1",
    createdAppeal.appellant_id,
    user1Id,
  );
  TestValidator.equals(
    "appeal reason should match",
    createdAppeal.appeal_reason,
    appealReason,
  );
  const appealId = createdAppeal.id;

  // 4. User 1 fetches their own appeal by id
  const fetchedAppeal = await api.functional.discussionBoard.user.appeals.at(
    connection,
    { appealId },
  );
  typia.assert(fetchedAppeal);
  TestValidator.equals("fetched appeal id", fetchedAppeal.id, appealId);
  TestValidator.equals(
    "fetched appeal reason",
    fetchedAppeal.appeal_reason,
    appealReason,
  );
  TestValidator.equals(
    "fetched appeal appellant",
    fetchedAppeal.appellant_id,
    user1Id,
  );

  // 5. Switch authentication to User 2
  await api.functional.auth.user.login(connection, {
    body: {
      email: user2Email,
      password: user2Password,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 6. User 2 attempts to fetch User 1's appeal (should fail: access denied or not found)
  await TestValidator.error(
    "User 2 should be denied access to User 1's appeal",
    async () => {
      await api.functional.discussionBoard.user.appeals.at(connection, {
        appealId,
      });
    },
  );

  // 7. User 2 attempts to fetch a nonexistent appeal id (should fail: not found)
  const bogusAppealId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Fetching non-existent appeal id should fail",
    async () => {
      await api.functional.discussionBoard.user.appeals.at(connection, {
        appealId: bogusAppealId,
      });
    },
  );
}
