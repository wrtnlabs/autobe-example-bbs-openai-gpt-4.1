import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test that a standard user (not admin) cannot update a password reset
 * record through the admin endpoint.
 *
 * This test verifies the platform's authorization boundary by ensuring
 * standard (non-admin) users cannot access the admin-only password reset
 * update endpoint. Only users with admin privileges should be permitted to
 * update password reset records using
 * /discussionBoard/admin/passwordResets/{passwordResetId}.
 *
 * Steps:
 *
 * 1. Register and auto-login as a new standard user (not admin).
 * 2. While authenticated as this standard user, attempt to call the admin
 *    endpoint PUT /discussionBoard/admin/passwordResets/{passwordResetId}
 *    with a valid UUID and valid update body (the actual reset record need
 *    not exist as access is controlled prior to record access).
 * 3. Assert that access is forbidden for non-admin users (TestValidator.error
 *    expects any error).
 *
 * This test ensures that non-admins cannot escalate privileges or modify
 * sensitive records through admin APIs, enforcing correct role-based access
 * control.
 */
export async function test_api_password_reset_update_forbidden_non_admin(
  connection: api.IConnection,
) {
  // 1. Register and auto-login as a standard user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12) + "Ab!1",
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // 2. Attempt forbidden update as a standard user
  const passwordResetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updateBody: IDiscussionBoardPasswordReset.IUpdate = {
    used_at: null,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // extend 1 hour from now
  };

  await TestValidator.error(
    "non-admin cannot update a password reset record via admin endpoint",
    async () => {
      await api.functional.discussionBoard.admin.passwordResets.update(
        connection,
        {
          passwordResetId,
          body: updateBody,
        },
      );
    },
  );
}
