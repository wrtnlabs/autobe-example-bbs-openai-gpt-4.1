import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful moderator registration with unique email, username, and
 * valid password.
 *
 * Verifies the registration workflow for moderator via /auth/moderator/join
 * - covers only the success path.
 *
 * This test ensures:
 *
 * - Registration with unique credentials completes and returns a valid token
 *   & moderator object
 * - Is_active is set to true, audit timestamps are present and correctly
 *   formatted
 * - Access and refresh tokens are present with date-time expiry
 * - Optional fields (revoked_at, suspended_until, deleted_at) are null or
 *   undefined
 *
 * Limitations:
 *
 * - Email, username, and password_hash uniqueness are assumed enforced by
 *   backend (not directly observable in output)
 * - Moderator's email is not exposed on the returned moderator object, so
 *   cannot be directly validated
 * - Email verification and post-join privilege escalation are outside this
 *   function's scope
 */
export async function test_api_moderator_registration_success(
  connection: api.IConnection,
) {
  // 1. Generate unique moderator credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const password = RandomGenerator.alphaNumeric(16);
  const display_name = RandomGenerator.name(); // Optional display

  // 2. Register moderator
  const result = await api.functional.auth.moderator.join(connection, {
    body: {
      email,
      username,
      password,
      display_name,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert<IDiscussionBoardModerator.IAuthorized>(result);

  // 3. Validate token fields
  const { token, moderator } = result;
  typia.assert(token);
  typia.assert(moderator);
  TestValidator.predicate(
    "access token present",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry is date-time string",
    typeof token.expired_at === "string" &&
      !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token expiry is date-time string",
    typeof token.refreshable_until === "string" &&
      !isNaN(Date.parse(token.refreshable_until)),
  );

  // 4. Validate moderator profile logic
  TestValidator.predicate(
    "moderator id is uuid",
    typeof moderator.id === "string" && /^[0-9a-fA-F-]{36}$/.test(moderator.id),
  );
  TestValidator.predicate(
    "user_id is uuid",
    typeof moderator.user_id === "string" &&
      /^[0-9a-fA-F-]{36}$/.test(moderator.user_id),
  );
  TestValidator.predicate("is_active is true", moderator.is_active === true);
  TestValidator.predicate(
    "assigned_at is date-time",
    typeof moderator.assigned_at === "string" &&
      !isNaN(Date.parse(moderator.assigned_at)),
  );
  TestValidator.predicate(
    "has created_at (date-time)",
    typeof moderator.created_at === "string" &&
      !isNaN(Date.parse(moderator.created_at)),
  );
  TestValidator.predicate(
    "has updated_at (date-time)",
    typeof moderator.updated_at === "string" &&
      !isNaN(Date.parse(moderator.updated_at)),
  );
  TestValidator.predicate(
    "revoked_at is null or undefined",
    moderator.revoked_at === null || moderator.revoked_at === undefined,
  );
  TestValidator.predicate(
    "suspended_until is null or undefined",
    moderator.suspended_until === null ||
      moderator.suspended_until === undefined,
  );
  TestValidator.predicate(
    "deleted_at is null or undefined",
    moderator.deleted_at === null || moderator.deleted_at === undefined,
  );
}
