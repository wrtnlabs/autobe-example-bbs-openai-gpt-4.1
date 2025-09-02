import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test user can log in with email and password after successful
 * registration.
 *
 * 1. Generate random, policy-compliant email, username, password
 * 2. Register the user using /auth/user/join (dependency)
 * 3. Attempt login using /auth/user/login with the same credentials
 * 4. Validate login response: user summary fields match initial registration;
 *    tokens/access/refresh are not empty; expiration timestamps are valid
 *    datetimes
 * 5. Validate user is_verified and is_suspended status (must be true/false).
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // step 1: generate unique user credentials (all policy compliant)
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const password = RandomGenerator.alphaNumeric(12) + "Aa!";
  const displayName = RandomGenerator.name();

  // step 2: register user using dependency endpoint
  const registration = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(registration);
  TestValidator.equals("registered email", registration.user.email, email);
  TestValidator.equals(
    "registered username",
    registration.user.username,
    username,
  );
  TestValidator.equals(
    "registered display_name",
    registration.user.display_name,
    displayName,
  );

  // step 3: login with correct credentials (using email and password)
  const login = await api.functional.auth.user.login(connection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(login);

  // step 4: validate login response tokens
  TestValidator.predicate(
    "access token present",
    typeof login.token.access === "string" && login.token.access.length > 10,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof login.token.refresh === "string" && login.token.refresh.length > 10,
  );
  TestValidator.predicate(
    "access token expiration is ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
      login.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
      login.token.refreshable_until,
    ),
  );

  // step 5: validate user session info
  TestValidator.equals("login email matches register", login.user.email, email);
  TestValidator.equals(
    "login username matches register",
    login.user.username,
    username,
  );
  TestValidator.equals(
    "login display_name matches register",
    login.user.display_name,
    displayName,
  );
  TestValidator.equals("user is verified", login.user.is_verified, true);
  TestValidator.equals("user is NOT suspended", login.user.is_suspended, false);
}
