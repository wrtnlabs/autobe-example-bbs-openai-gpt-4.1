import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful login of a discussion board moderator following the
 * verification process.
 *
 * Verifies that a moderator, once registered and (implicitly) verified, can
 * successfully log in and receives proper JWT tokens along with authorized
 * moderator session data. Explicit verification cannot be simulated as
 * there is no explicit verification API, so registration is assumed to
 * produce a verifiable account for the purposes of this test.
 *
 * Steps:
 *
 * 1. Register a new moderator account using random, unique data (email,
 *    username, password, consent=true)
 * 2. (Simulation) Assume the registration produces a verified account, since
 *    there is no verification API
 * 3. Attempt login with the registered moderator's credentials
 * 4. Validate that login is successful, that JWT tokens are returned, and that
 *    the moderator profile in login response matches registration
 *    information
 */
export async function test_api_moderator_login_success_after_verification(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12);

  const joinOutput = await api.functional.auth.moderator.join(connection, {
    body: {
      email,
      username,
      password,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(joinOutput);
  TestValidator.equals(
    "joined moderator id is consistent",
    joinOutput.moderator.user_id,
    joinOutput.moderator.user_id,
  );
  TestValidator.predicate(
    "join output includes non-empty access token",
    typeof joinOutput.token.access === "string" &&
      joinOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "join output includes non-empty refresh token",
    typeof joinOutput.token.refresh === "string" &&
      joinOutput.token.refresh.length > 0,
  );

  // 2. (Simulation) Account is assumed verified; no verification API is available

  // 3. Attempt login with registered credentials
  const loginOutput = await api.functional.auth.moderator.login(connection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(loginOutput);
  TestValidator.equals(
    "login response moderator user_id matches registration",
    loginOutput.moderator.user_id,
    joinOutput.moderator.user_id,
  );
  TestValidator.predicate(
    "login output includes non-empty access token",
    typeof loginOutput.token.access === "string" &&
      loginOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "login output includes non-empty refresh token",
    typeof loginOutput.token.refresh === "string" &&
      loginOutput.token.refresh.length > 0,
  );
}
