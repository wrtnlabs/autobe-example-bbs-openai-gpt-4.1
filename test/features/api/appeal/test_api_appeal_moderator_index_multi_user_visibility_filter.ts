import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import type { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate moderator ability to search/filter all user appeals and confirm
 * role-based visibility with error handling.
 *
 * This test verifies that a moderator can: (1) View appeals submitted by
 * multiple users (2) Filter by appellant_id and status (3) Receive
 * paginated responses with valid metadata (4) See input validation enforced
 * (e.g., excessive limit)
 *
 * Business flow:
 *
 * 1. Register a new moderator and save credentials
 * 2. Register two users with distinct accounts/credentials
 * 3. Log in as user1, submit an appeal (record its ID)
 * 4. Log in as user2, submit an appeal with different narrative
 * 5. Log in as moderator
 * 6. Fetch all appeals as moderator and validate both users' appeals returned
 * 7. Filter by appellant_id (user-specific filtering)
 * 8. Filter by status (e.g., 'pending') and validate returned appeals all
 *    match
 * 9. Trigger error by exceeding max page size limit (should error)
 * 10. Validate all response types and business logic via TestValidator
 */
export async function test_api_appeal_moderator_index_multi_user_visibility_filter(
  connection: api.IConnection,
) {
  // 1. Register moderator
  const moderatorEmail = `${RandomGenerator.alphaNumeric(8)}@modmail.com`;
  const moderatorUsername = RandomGenerator.name();
  const moderatorPassword = RandomGenerator.alphaNumeric(14) + "!A1";
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      display_name: RandomGenerator.name(2),
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorJoin);

  // 2. Register two users
  const user1Email = `${RandomGenerator.alphaNumeric(8)}@usermail.com`;
  const user2Email = `${RandomGenerator.alphaNumeric(8)}@usermail.com`;
  const user1Username = RandomGenerator.name();
  const user2Username = RandomGenerator.name();
  const userPassword = RandomGenerator.alphaNumeric(14) + "@a1";

  // User 1 registration
  const user1Join = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Username,
      password: userPassword,
      display_name: RandomGenerator.name(2),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1Join);

  // User 2 registration
  const user2Join = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: userPassword,
      display_name: RandomGenerator.name(2),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2Join);

  // 3. Log in as User 1 and submit appeal
  await api.functional.auth.user.login(connection, {
    body: {
      email: user1Email,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  const user1Appeal = await api.functional.discussionBoard.user.appeals.create(
    connection,
    {
      body: {
        appellant_id: user1Join.user.id,
        appeal_reason: RandomGenerator.paragraph({ sentences: 8 }),
        moderation_action_id: null,
        flag_report_id: null,
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(user1Appeal);

  // 4. Log in as User 2 and submit appeal
  await api.functional.auth.user.login(connection, {
    body: {
      email: user2Email,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  const user2Appeal = await api.functional.discussionBoard.user.appeals.create(
    connection,
    {
      body: {
        appellant_id: user2Join.user.id,
        appeal_reason: RandomGenerator.paragraph({ sentences: 10 }),
        moderation_action_id: null,
        flag_report_id: null,
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(user2Appeal);

  // 5. Log in as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 6. Fetch all appeals as moderator
  const allAppeals =
    await api.functional.discussionBoard.moderator.appeals.index(connection, {
      body: {} satisfies IDiscussionBoardAppeal.IRequest,
    });
  typia.assert(allAppeals);

  // 7. Validate both users’ appeals are present
  const appealUserIds = allAppeals.data.map((a) => a.appellant_id);
  TestValidator.predicate(
    "both user1 and user2’s appeals visible to moderator",
    appealUserIds.includes(user1Join.user.id) &&
      appealUserIds.includes(user2Join.user.id),
  );
  TestValidator.equals(
    "pagination structure must be present in all appeals result",
    Object.keys(allAppeals.pagination).sort(),
    ["current", "limit", "pages", "records"].sort(),
  );

  // 8. Filter by appellant_id: user 1
  const filteredAppealsUser1 =
    await api.functional.discussionBoard.moderator.appeals.index(connection, {
      body: {
        appellant_id: user1Join.user.id,
      } satisfies IDiscussionBoardAppeal.IRequest,
    });
  typia.assert(filteredAppealsUser1);
  TestValidator.predicate(
    "filter by appellant_id returned only user1’s appeals",
    filteredAppealsUser1.data.every(
      (a) => a.appellant_id === user1Join.user.id,
    ),
  );

  // 9. Filter by appellant_id: user 2
  const filteredAppealsUser2 =
    await api.functional.discussionBoard.moderator.appeals.index(connection, {
      body: {
        appellant_id: user2Join.user.id,
      } satisfies IDiscussionBoardAppeal.IRequest,
    });
  typia.assert(filteredAppealsUser2);
  TestValidator.predicate(
    "filter by appellant_id returned only user2’s appeals",
    filteredAppealsUser2.data.every(
      (a) => a.appellant_id === user2Join.user.id,
    ),
  );

  // 10. Filter by status: 'pending'
  const status = user1Appeal.status;
  const filteredAppealsByStatus =
    await api.functional.discussionBoard.moderator.appeals.index(connection, {
      body: { status } satisfies IDiscussionBoardAppeal.IRequest,
    });
  typia.assert(filteredAppealsByStatus);
  TestValidator.predicate(
    "all appeals in status filter match the requested status",
    filteredAppealsByStatus.data.every((a) => a.status === status),
  );

  // 11. Trigger validation error by exceeding allowed limit (e.g., 1000)
  await TestValidator.error(
    "excessive pagination limit triggers input validation error",
    async () => {
      await api.functional.discussionBoard.moderator.appeals.index(connection, {
        body: { limit: 1000 } satisfies IDiscussionBoardAppeal.IRequest,
      });
    },
  );
}
