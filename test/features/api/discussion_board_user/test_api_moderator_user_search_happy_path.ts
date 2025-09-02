import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E happy path test for moderator user search API.
 *
 * 1. Register and login as a moderator
 * 2. As a moderator, perform paginated user search: a. Fetch first page,
 *    default settings b. Search by a (random) email value c. Search by
 *    partial or exact username d. Filter by a specific status
 *    (verification/suspension) e. Test pagination by requesting a page with
 *    a specified limit
 * 3. Validate (for each case):
 *
 *    - Only permissible user fields are returned for moderator (no password
 *         hash, etc.)
 *    - Users returned match the search/filter parameters where applicable
 *    - Pagination metadata is present and consistent with the data
 *    - Role-based access: results should be allowed for moderator
 */
export async function test_api_moderator_user_search_happy_path(
  connection: api.IConnection,
) {
  // 1. Register and login as moderator
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    consent: true,
  } satisfies IDiscussionBoardModerator.IJoin;
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: moderatorJoinInput,
  });
  typia.assert(moderatorAuth);

  // 2. Paginated search as moderator
  // (a) Fetch first page, default settings
  const respDefault =
    await api.functional.discussionBoard.moderator.users.index(connection, {
      body: {},
    });
  typia.assert(respDefault);
  TestValidator.predicate(
    "pagination present (default settings)",
    !!respDefault.pagination && !!respDefault.data,
  );
  respDefault.data.forEach((user) => {
    // Only permitted fields for moderator
    TestValidator.predicate("email present", typeof user.email === "string");
    TestValidator.predicate(
      "username present",
      typeof user.username === "string",
    );
    TestValidator.predicate("no password field", !("password" in user));
    TestValidator.predicate(
      "no password_hash field",
      !("password_hash" in user),
    );
  });

  // (b) Search by email
  if (respDefault.data.length > 0) {
    const targetEmail = respDefault.data[0].email;
    const respByEmail =
      await api.functional.discussionBoard.moderator.users.index(connection, {
        body: { email: targetEmail },
      });
    typia.assert(respByEmail);
    respByEmail.data.forEach((user) => {
      TestValidator.equals(
        "user email matches filter",
        user.email,
        targetEmail,
      );
    });
  }

  // (c) Search by username
  if (respDefault.data.length > 0) {
    const targetUsername = respDefault.data[0].username;
    const respByUsername =
      await api.functional.discussionBoard.moderator.users.index(connection, {
        body: { username: targetUsername },
      });
    typia.assert(respByUsername);
    respByUsername.data.forEach((user) => {
      TestValidator.equals(
        "user username matches filter",
        user.username,
        targetUsername,
      );
    });
  }

  // (d) Filter by verification status
  const respVerified =
    await api.functional.discussionBoard.moderator.users.index(connection, {
      body: { is_verified: true },
    });
  typia.assert(respVerified);
  respVerified.data.forEach((user) => {
    TestValidator.equals("user is verified", user.is_verified, true);
  });

  // (e) Request with pagination limit
  const respPaged = await api.functional.discussionBoard.moderator.users.index(
    connection,
    {
      body: { page: 1, limit: 2 },
    },
  );
  typia.assert(respPaged);
  TestValidator.equals(
    "pagination.limit matches request",
    respPaged.pagination.limit,
    2,
  );
  TestValidator.predicate("data length ≤ limit", respPaged.data.length <= 2);
}
