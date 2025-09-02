import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * Validate cross-role admin access to user appeals in the discussion board
 * system.
 *
 * This test covers the workflow of a standard user submitting an appeal,
 * and an admin (who is the same underlying account elevated to admin
 * privileges) accessing the full appeal details. It validates:
 *
 * - User registration and authentication
 * - Appeal creation by a user
 * - Admin registration and admin authentication context switching
 * - Successful admin retrieval of any appeal via GET
 *   /discussionBoard/admin/appeals/{appealId}
 * - Equality of narrative, status, and relationships between creation and
 *   admin view
 * - Privilege boundaries and correct audit flows
 *
 * Steps:
 *
 * 1. Register a user (new unique email, username, password, consent true,
 *    display_name)
 * 2. User creates an appeal (with reason text)
 * 3. Register user as admin (using user_id from registration)
 * 4. Log in as admin (to ensure admin session)
 * 5. Admin queries GET /discussionBoard/admin/appeals/{appealId}
 * 6. Validate that the returned appeal matches creation parameters and
 *    complete admin data is returned
 */
export async function test_api_appeal_admin_access_success(
  connection: api.IConnection,
) {
  // 1. Register User
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const username: string = RandomGenerator.name(1);
  // Ensure password has at least 12 chars, with upper, lower, digit, and special char per policy
  const password: string =
    RandomGenerator.alphaNumeric(8) +
    "A" +
    "a" +
    "1" +
    "!" +
    RandomGenerator.alphaNumeric(2);
  const userDisplayName: string = RandomGenerator.name(1);
  const userReg = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password,
      display_name: userDisplayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert<IDiscussionBoardUser.IAuthorized>(userReg);
  const user = userReg.user;

  // 2. Create Appeal as user
  const appealReason: string = RandomGenerator.paragraph({ sentences: 8 });
  const createdAppeal =
    await api.functional.discussionBoard.user.appeals.create(connection, {
      body: {
        appellant_id: user.id,
        appeal_reason: appealReason,
      } satisfies IDiscussionBoardAppeal.ICreate,
    });
  typia.assert<IDiscussionBoardAppeal>(createdAppeal);
  const appealId = createdAppeal.id;

  // 3. Register user as Admin
  const adminReg = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert<IDiscussionBoardAdmin.IAuthorized>(adminReg);
  // 4. Log in as Admin
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: userEmail,
      password,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert<IDiscussionBoardAdmin.IAuthorized>(adminLogin);

  // 5. Admin retrieves appeal details
  const appealView = await api.functional.discussionBoard.admin.appeals.at(
    connection,
    {
      appealId,
    },
  );
  typia.assert<IDiscussionBoardAppeal>(appealView);

  // 6. Validate returned appeal matches the one created
  TestValidator.equals("appeal id matches", appealView.id, createdAppeal.id);
  TestValidator.equals(
    "appellant id matches",
    appealView.appellant_id,
    createdAppeal.appellant_id,
  );
  TestValidator.equals(
    "appeal reason matches",
    appealView.appeal_reason,
    createdAppeal.appeal_reason,
  );
  TestValidator.equals(
    "status matches",
    appealView.status,
    createdAppeal.status,
  );
  TestValidator.equals(
    "created_at matches",
    appealView.created_at,
    createdAppeal.created_at,
  );
  TestValidator.equals(
    "moderation_action_id matches",
    appealView.moderation_action_id,
    createdAppeal.moderation_action_id,
  );
  TestValidator.equals(
    "flag_report_id matches",
    appealView.flag_report_id,
    createdAppeal.flag_report_id,
  );
}
