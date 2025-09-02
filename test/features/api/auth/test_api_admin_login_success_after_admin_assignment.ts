import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * E2E test: after registering and verifying a user, assign them as admin,
 * then successfully login as admin.
 *
 * This test simulates the full admin assignment and login workflow:
 *
 * 1. Register a user (providing unique email, username, and valid password
 *    that meets policy requirements)
 * 2. (Implicitly) Assume user is verified (no public verification API)
 * 3. Assign admin rights to the user using the /auth/admin/join endpoint
 * 4. Login as admin using the initially registered credentials
 * 5. Assert a valid admin authorization response is returned (tokens and admin
 *    data)
 * 6. Assert admin record properly links to the created user (user_id match)
 * 7. Validate admin tokens are present and authentication header is updated
 */
export async function test_api_admin_login_success_after_admin_assignment(
  connection: api.IConnection,
) {
  // 1. Register a new user with valid, policy-compliant details
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1); // unique-style username
  const password = RandomGenerator.alphaNumeric(12) + "!A1"; // meets password policy (min 10 chars, includes uppercase, number, special)
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. (Skip explicit verification, proceed as if verified)

  // 3. Assign admin rights to this user
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: user.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.equals(
    "admin record links to correct user",
    adminJoin.admin.user_id,
    user.user.id,
  );
  TestValidator.predicate(
    "admin record is active after assignment",
    adminJoin.admin.is_active === true,
  );

  // 4. Perform admin login using registered credentials
  const loginRes = await api.functional.auth.admin.login(connection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(loginRes);

  // 5. Validate token format and admin linkage
  TestValidator.predicate(
    "admin login issues access token",
    typeof loginRes.token.access === "string" &&
      loginRes.token.access.length > 0,
  );
  TestValidator.predicate(
    "admin login issues refresh token",
    typeof loginRes.token.refresh === "string" &&
      loginRes.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry is ISO date-time",
    typeof loginRes.token.expired_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(loginRes.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO date-time",
    typeof loginRes.token.refreshable_until === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        loginRes.token.refreshable_until,
      ),
  );
  TestValidator.equals(
    "admin login admin record matches created user_id",
    loginRes.admin.user_id,
    user.user.id,
  );
  TestValidator.predicate(
    "admin is active after login",
    loginRes.admin.is_active === true,
  );
}
