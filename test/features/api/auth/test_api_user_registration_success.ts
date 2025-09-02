import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  /**
   * Test successful registration of a new standard user account.
   *
   * This test verifies that registering a new user with unique email, unique
   * username, valid password, and optional display_name will create a new user
   * as unverified (is_verified: false), unsuspended (is_suspended: false), and
   * that authentication tokens are issued. It also implicitly validates that
   * the verification flow is initiated.
   *
   * Steps:
   *
   * 1. Generate unique email and username values.
   * 2. Use a valid password meeting documented requirements (>=10 chars, includes
   *    uppercase, number, special char).
   * 3. Optionally set display_name using various legitimate forms.
   * 4. Call /auth/user/join endpoint via api.functional.auth.user.join.
   * 5. Assert that user summary properties match submitted data, is_verified and
   *    is_suspended flags are correct.
   * 6. Assert issued tokens and their fields are present and valid ISO date
   *    strings.
   * 7. Repeat with omitted display_name.
   * 8. Repeat with empty string display_name (edge case).
   */

  // 1. Prepare common valid, unique user registration payload
  const input = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(14),
    password: "Aa1!xyzmnoPQ", // Satisfies policy: 12 chars, has upper, lower, number, special char
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;

  // 2. Invoke user join API
  const result = await api.functional.auth.user.join(connection, {
    body: input,
  });
  typia.assert(result);

  // 3. Assert returned type is valid
  TestValidator.equals(
    "returned email matches input",
    result.user.email,
    input.email,
  );
  TestValidator.equals(
    "returned username matches input",
    result.user.username,
    input.username,
  );
  TestValidator.equals(
    "returned display_name matches input",
    result.user.display_name,
    input.display_name,
  );
  TestValidator.equals(
    "user is not verified by default",
    result.user.is_verified,
    false,
  );
  TestValidator.equals(
    "user is not suspended by default",
    result.user.is_suspended,
    false,
  );

  // 4. Token assertions
  typia.assert(result.token);
  TestValidator.predicate(
    "token.access should be non-empty string",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh should be non-empty string",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      result.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      result.token.refreshable_until,
    ),
  );

  // 5. Omitted display_name case
  const noDisplay = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(14),
    password: "Mm8$asdfGHIJ",
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const result2 = await api.functional.auth.user.join(connection, {
    body: noDisplay,
  });
  typia.assert(result2);
  TestValidator.equals(
    "display_name is undefined when omitted",
    result2.user.display_name,
    undefined,
  );

  // 6. Empty string display_name case
  const emptyDisplay = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(14),
    password: "Zz6$klmnOPQR",
    display_name: "",
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const result3 = await api.functional.auth.user.join(connection, {
    body: emptyDisplay,
  });
  typia.assert(result3);
  TestValidator.equals(
    "display_name is empty string when given",
    result3.user.display_name,
    "",
  );
}
