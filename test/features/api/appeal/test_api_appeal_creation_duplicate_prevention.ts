import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * Test that duplicate appeals by a user for the same moderation action or
 * flag report are prevented.
 *
 * Scenario:
 *
 * 1. Register a new user (ensuring unique email/username for test
 *    repeatability).
 * 2. Authenticate as this user (token managed automatically by join endpoint).
 * 3. Create a unique target for appeal (use random uuid for
 *    moderation_action_id OR flag_report_id; the other may be null).
 * 4. Submit the first appeal with a reason against the target reference.
 * 5. Attempt to submit a second appeal for the same target and reason as the
 *    same user.
 * 6. Assert that the API responds with a duplicate constraint error on second
 *    attempt (using TestValidator.error).
 * 7. Optionally test both target types (moderation_action_id and
 *    flag_report_id) for comprehensive coverage.
 */
export async function test_api_appeal_creation_duplicate_prevention(
  connection: api.IConnection,
) {
  // 1. Register a new user for this test
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userUsername: string = RandomGenerator.name();
  const userPassword: string = "Password123!";
  const userJoin: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        username: userUsername,
        password: userPassword,
        consent: true,
        // Optionally set display_name
        display_name: RandomGenerator.name(1),
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(userJoin);

  const userId = userJoin.user.id;

  // 2. Create an appeal with a random moderation_action_id (flag_report_id null)
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();
  const appealInput: IDiscussionBoardAppeal.ICreate = {
    appellant_id: userId,
    moderation_action_id: moderationActionId,
    flag_report_id: null,
    appeal_reason: RandomGenerator.paragraph({ sentences: 5 }),
  };

  const appeal: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.user.appeals.create(connection, {
      body: appealInput,
    });
  typia.assert(appeal);
  TestValidator.equals(
    "Appeal creation: moderation_action_id matches",
    appeal.moderation_action_id,
    moderationActionId,
  );
  TestValidator.equals(
    "Appeal creation: appellant user id matches",
    appeal.appellant_id,
    userId,
  );
  TestValidator.equals(
    "Appeal creation: flag_report_id is null",
    appeal.flag_report_id,
    null,
  );

  // 3. Attempt a duplicate appeal for same moderation_action_id and user
  await TestValidator.error(
    "Duplicate appeal for same moderation_action_id is prevented",
    async () => {
      await api.functional.discussionBoard.user.appeals.create(connection, {
        body: appealInput,
      });
    },
  );

  // 4. Repeat with a random flag_report_id (moderation_action_id null)
  const flagReportId = typia.random<string & tags.Format<"uuid">>();
  const appealInput2: IDiscussionBoardAppeal.ICreate = {
    appellant_id: userId,
    moderation_action_id: null,
    flag_report_id: flagReportId,
    appeal_reason: RandomGenerator.paragraph({ sentences: 4 }),
  };
  const appeal2: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.user.appeals.create(connection, {
      body: appealInput2,
    });
  typia.assert(appeal2);
  TestValidator.equals(
    "Appeal creation: flag_report_id matches",
    appeal2.flag_report_id,
    flagReportId,
  );
  TestValidator.equals(
    "Appeal creation: appellant user id matches",
    appeal2.appellant_id,
    userId,
  );
  TestValidator.equals(
    "Appeal creation: moderation_action_id is null",
    appeal2.moderation_action_id,
    null,
  );

  await TestValidator.error(
    "Duplicate appeal for same flag_report_id is prevented",
    async () => {
      await api.functional.discussionBoard.user.appeals.create(connection, {
        body: appealInput2,
      });
    },
  );
}
