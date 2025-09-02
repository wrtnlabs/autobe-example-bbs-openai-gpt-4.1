import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that a user can retrieve their own account detail record via GET
 * /discussionBoard/user/users/{userId}.
 *
 * This test covers the typical user registration and profile viewing
 * workflow:
 *
 * 1. Register a new discussion board user with unique email, username,
 *    password, and optional display name, providing explicit consent as
 *    required.
 * 2. Use the returned session (JWT token automatically set in connection) to
 *    request the user's detailed account record by userId immediately.
 * 3. Assert that all expected (non-sensitive) fields are present and that
 *    their values match what was submitted at registration (e.g., email,
 *    username, display_name, is_verified, timestamps). The account should
 *    not be suspended or deleted. Timestamps (created_at, updated_at) must
 *    be valid ISO8601 date-time strings, and all user meta fields should be
 *    correctly reflected.
 */
export async function test_api_user_account_detail_success_self_access(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account with unique credentials
  const registrationInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12) + "A#1!x", // strong password ensures validation
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;

  const joinResponse: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationInput,
    });
  typia.assert(joinResponse);
  const { user: joinedSummary } = joinResponse;

  // Step 2: Retrieve own detailed account information using returned userId and session
  const detail: IDiscussionBoardUser =
    await api.functional.discussionBoard.user.users.at(connection, {
      userId: joinedSummary.id,
    });
  typia.assert(detail);

  // Step 3: Verify detail fields match registration input and expected properties
  TestValidator.equals("userId matches", detail.id, joinedSummary.id);
  TestValidator.equals("email matches", detail.email, registrationInput.email);
  TestValidator.equals(
    "username matches",
    detail.username,
    registrationInput.username,
  );
  TestValidator.equals(
    "display_name matches",
    detail.display_name,
    registrationInput.display_name,
  );
  TestValidator.equals("is_verified default false", detail.is_verified, false);
  TestValidator.equals(
    "is_suspended default false",
    detail.is_suspended,
    false,
  );
  TestValidator.equals("not suspended until", detail.suspended_until, null);
  TestValidator.predicate(
    "created_at is ISO8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?/.test(detail.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?/.test(detail.updated_at),
  );
  TestValidator.equals("not deleted", detail.deleted_at, null);
  // last_login_at may be null, undefined, or an ISO8601 string on first join; check accordingly
  TestValidator.predicate(
    "last_login_at is null/undefined or ISO8601",
    detail.last_login_at === null ||
      detail.last_login_at === undefined ||
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?/.test(
        detail.last_login_at!,
      ),
  );
}
