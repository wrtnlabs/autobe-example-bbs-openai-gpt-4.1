import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardJwtToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardJwtToken";
import type { IPageIDiscussionBoardJwtToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardJwtToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate paginated JWT token session list retrieval for an authenticated
 * user.
 *
 * 1. Register a new discussion board user with unique credentials.
 * 2. Simulate additional device/browser logins by creating new api.IConnection
 *    instances and authenticating as the same user.
 * 3. Using one connection, call PATCH /discussionBoard/user/jwtTokens with: a.
 *    No filter (should return all tokens belonging to the user). b.
 *    Pagination parameters (page/limit). c. Status filter (active /
 *    revoked). d. Out-of-range pagination (empty data).
 * 4. For each call, check:
 *
 *    - All returned tokens belong to this user.
 *    - Pagination metadata matches (#pages, limit, record count).
 *    - Filtering respects 'status' and token properties.
 *    - Data structures match expected types
 *         (IPageIDiscussionBoardJwtToken.ISummary, etc).
 * 5. If possible, simulate revoking a token (e.g., by removing/distinguishing
 *    it in logic), and verify subsequent filtered vs. unfiltered
 *    retrieval.
 */
export async function test_api_jwt_token_list_retrieval(
  connection: api.IConnection,
) {
  // 1. Register user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "Aa!";
  const displayName = RandomGenerator.name();
  const baseInput = {
    email,
    username,
    password,
    consent: true,
    display_name: displayName,
  } satisfies IDiscussionBoardUser.ICreate;
  const join = await api.functional.auth.user.join(connection, {
    body: baseInput,
  });
  typia.assert(join);

  // 2. Emulate multi-session (multiple logins from different devices/sessions)
  const connections = [connection];
  for (let i = 0; i < 2; ++i) {
    const other = { ...connection, headers: undefined };
    await api.functional.auth.user.join(other, { body: baseInput });
    connections.push(other);
  }
  // Now we have 3 tokens for the same user

  // 3a. Retrieve all sessions for authenticated user
  const respAll = await api.functional.discussionBoard.user.jwtTokens.index(
    connection,
    { body: {} } as { body: IDiscussionBoardJwtToken.IRequest },
  );
  typia.assert(respAll);
  const tokenIds = respAll.data.map((r) => r.id);
  for (const row of respAll.data)
    TestValidator.equals(
      "returned token belongs to correct user",
      row.discussion_board_user_id,
      join.user.id,
    );
  TestValidator.predicate("got at least 3 tokens", respAll.data.length >= 3);
  TestValidator.equals(
    "pagination reflects total tokens",
    respAll.pagination.records,
    respAll.data.length,
  );

  // 3b. Pagination: limit = 2
  const respPage = await api.functional.discussionBoard.user.jwtTokens.index(
    connection,
    { body: { page: 1, limit: 2 } satisfies IDiscussionBoardJwtToken.IRequest },
  );
  typia.assert(respPage);
  TestValidator.equals(
    "page contains <= limit entries",
    respPage.data.length <= 2,
    true,
  );
  TestValidator.equals(
    "pagination current page 1",
    respPage.pagination.current,
    1,
  );

  // 3c. Status filter: active
  const respActive = await api.functional.discussionBoard.user.jwtTokens.index(
    connection,
    { body: { status: "active" } satisfies IDiscussionBoardJwtToken.IRequest },
  );
  typia.assert(respActive);
  for (const row of respActive.data) {
    TestValidator.equals("active token not revoked", row.revoked_at, null);
    TestValidator.equals(
      "active token belongs to user",
      row.discussion_board_user_id,
      join.user.id,
    );
  }

  // 3d. Status filter: revoked (should be empty unless system auto-revokes)
  const respRevoked = await api.functional.discussionBoard.user.jwtTokens.index(
    connection,
    { body: { status: "revoked" } satisfies IDiscussionBoardJwtToken.IRequest },
  );
  typia.assert(respRevoked);
  for (const row of respRevoked.data)
    TestValidator.equals(
      "revoked token is really revoked",
      typeof row.revoked_at,
      "string",
    );

  // 3e. Out-of-range page (should yield empty data)
  const respEmpty = await api.functional.discussionBoard.user.jwtTokens.index(
    connection,
    {
      body: {
        page: 1000,
        limit: 10,
      } satisfies IDiscussionBoardJwtToken.IRequest,
    },
  );
  typia.assert(respEmpty);
  TestValidator.equals("out-of-range page is empty", respEmpty.data.length, 0);

  // 4. Security: register a second user, ensure only own tokens are shown
  const email2 = typia.random<string & tags.Format<"email">>();
  const username2 = RandomGenerator.name();
  const password2 = RandomGenerator.alphaNumeric(12) + "Xx!";
  const join2 = await api.functional.auth.user.join(connection, {
    body: {
      email: email2,
      username: username2,
      password: password2,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(join2);
  // Now tokens are switched to second user
  const respOwn = await api.functional.discussionBoard.user.jwtTokens.index(
    connection,
    { body: {} } as { body: IDiscussionBoardJwtToken.IRequest },
  );
  typia.assert(respOwn);
  for (const row of respOwn.data)
    TestValidator.equals(
      "no tokens from other users",
      row.discussion_board_user_id,
      join2.user.id,
    );
}
