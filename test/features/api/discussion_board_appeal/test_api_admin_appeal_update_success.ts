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
 * E2E: Admin successfully updates an appeal.
 *
 * This test walks through a cross-role workflow:
 *
 * 1. A user is registered (unique credentials, consent).
 * 2. The user creates an appeal (simple narrative, no moderation_action/flag
 *    links).
 * 3. A separate user is registered to be the admin (unique credentials,
 *    consent), then granted admin role.
 * 4. Admin logs in (auth context change).
 * 5. Admin updates the appeal using allowed fields
 *    (status/resolution_comment).
 * 6. The response is validated to check the update.
 */
export async function test_api_admin_appeal_update_success(
  connection: api.IConnection,
) {
  // 1. Register regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserPass!12345";
  const userUsername = RandomGenerator.name();
  const userRegister = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userRegister);

  // 2. As user, create appeal
  const appealReason = RandomGenerator.paragraph({
    sentences: 7,
    wordMin: 5,
    wordMax: 15,
  });
  const createdAppeal =
    await api.functional.discussionBoard.user.appeals.create(connection, {
      body: {
        appellant_id: userRegister.user.id,
        appeal_reason: appealReason,
      } satisfies IDiscussionBoardAppeal.ICreate,
    });
  typia.assert(createdAppeal);

  // 3. Register admin base user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPW!123456";
  const adminUsername = RandomGenerator.name();
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUser);

  // 4. Grant admin privileges to admin user
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUser.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 5. Log in as admin to get correct context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 6. Admin updates the appeal
  const updatedStatus = "reviewed";
  const updatedComment = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const updateAppealResult =
    await api.functional.discussionBoard.admin.appeals.update(connection, {
      appealId: createdAppeal.id,
      body: {
        status: updatedStatus,
        resolution_comment: updatedComment,
      } satisfies IDiscussionBoardAppeal.IUpdate,
    });
  typia.assert(updateAppealResult);

  // Validate response reflects update
  TestValidator.equals(
    "appeal updated status",
    updateAppealResult.status,
    updatedStatus,
  );
  TestValidator.equals(
    "appeal updated resolution_comment",
    updateAppealResult.resolution_comment,
    updatedComment,
  );
}
