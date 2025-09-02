import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitor";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Ensures a registered visitor can refresh their anonymous session.
 *
 * This test validates the join and refresh flow for discussion board
 * visitors:
 *
 * 1. Register a new visitor (anonymous guest) to receive an initial
 *    visitor_token.
 * 2. Use the visitor_token to request a session refresh.
 * 3. Confirm that the new session issues a new visitor_token, updated audit
 *    data, and preserves the 'visitor' role.
 * 4. All responses must conform to IDiscussionBoardVisitor.IAuthorized and
 *    contain valid IAuthorizationToken properties.
 *
 * Steps:
 *
 * 1. Call /auth/visitor/join with optional device auditing properties.
 * 2. Assert response role is 'visitor', visitor_token and token are present.
 * 3. Call /auth/visitor/refresh with previous visitor_token.
 * 4. Assert a new visitor_token, updated issued_at/expires_at, and role
 *    remains 'visitor'.
 * 5. Validate all type-safety and business logic rules for tokens and audit
 *    properties.
 */
export async function test_api_visitor_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a visitor (guest session)
  const registrationInput = {
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
    ip_address: undefined, // optional and not format-enforced; provide undefined for coverage
  } satisfies IDiscussionBoardVisitor.IJoin;
  const registered: IDiscussionBoardVisitor.IAuthorized =
    await api.functional.auth.visitor.join(connection, {
      body: registrationInput,
    });
  typia.assert(registered);
  TestValidator.equals("visitor role is correct", registered.role, "visitor");
  TestValidator.predicate(
    "visitor_token must be present",
    typeof registered.visitor_token === "string" &&
      !!registered.visitor_token.length,
  );
  typia.assert<IAuthorizationToken>(registered.token);

  // 2. Refresh using the issued visitor_token
  const refreshInput = {
    visitor_token: registered.visitor_token,
  } satisfies IDiscussionBoardVisitor.IRefresh;
  const refreshed: IDiscussionBoardVisitor.IAuthorized =
    await api.functional.auth.visitor.refresh(connection, {
      body: refreshInput,
    });
  typia.assert(refreshed);
  TestValidator.equals(
    "refreshed visitor role is correct",
    refreshed.role,
    "visitor",
  );
  TestValidator.notEquals(
    "refreshed token should differ",
    refreshed.visitor_token,
    registered.visitor_token,
  );
  TestValidator.notEquals(
    "issued_at should be updated",
    refreshed.issued_at,
    registered.issued_at,
  );
  TestValidator.notEquals(
    "expires_at should be updated",
    refreshed.expires_at,
    registered.expires_at,
  );
  typia.assert<IAuthorizationToken>(refreshed.token);
}
