import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate failed login scenario while using administrator credentials.
 *
 * Business context: An already-registered, verified normal user is granted
 * admin status, and an attempt is made to log in to the admin portal with a
 * WRONG password. The system must correctly reject unauthorized admin
 * logins, and not issue tokens or allow access based solely on privilege
 * assignment. This is critical to prevent privilege escalation or brute
 * force by role assignment, and to ensure auditing of failed attempts works
 * as designed (log inspection is not possible here, but error must occur at
 * runtime).
 *
 * Steps:
 *
 * 1. Register a normal user via /auth/user/join (random email, password,
 *    username)
 * 2. [Implicit] Treat user as verified for admin assignment
 * 3. Assign admin role to the verified user via /auth/admin/join with their
 *    user_id
 * 4. Attempt to login via /auth/admin/login with email but an INVALID password
 * 5. Confirm that login fails and does NOT issue an admin token, using
 *    TestValidator.error (with correct async/await usage and a mandatory
 *    title).
 * 6. (Cannot check audit logs directly, but completion of error throw
 *    suffices.)
 */
export async function test_api_admin_login_failure_invalid_credentials(
  connection: api.IConnection,
) {
  // 1. Register base user
  const email = typia.random<string & tags.Format<"email">>();
  const basePassword = "ValidP@ssw0rd1";
  const username = RandomGenerator.name();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password: basePassword,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Admin assignment
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: user.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. Attempt admin login with BAD password
  await TestValidator.error(
    "admin login fails when password is incorrect",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email,
          password: "WrongP@ssw0rd2", // intentionally incorrect
        } satisfies IDiscussionBoardAdmin.ILogin,
      });
    },
  );
}
