import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitor";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate rejection and error handling when attempting to refresh a
 * visitor session token with an invalid or expired token.
 *
 * This test ensures the system correctly denies access and does not issue a
 * new authorization/session when a malformed, revoked, or otherwise invalid
 * visitor_token is provided to the /auth/visitor/refresh endpoint. It
 * verifies that authentication schema violations or attempts to use
 * tampered or expired tokens are robustly handled, preventing unauthorized
 * session escalation.
 *
 * Steps:
 *
 * 1. Create a syntactically invalid (malformed) visitor token (e.g., random
 *    string, too short, gibberish).
 * 2. Attempt to refresh a visitor session using this invalid token via the
 *    refresh endpoint.
 * 3. Confirm that the server responds with an appropriate error (such as 401
 *    Unauthorized) and no session or visitor_token is returned.
 * 4. Create a syntactically valid token (e.g., base64 string, resembling a JWT
 *    but not a real token in the system).
 * 5. Attempt the refresh again with this kind of token and confirm the same
 *    denial and no session is issued.
 *
 * Only negative cases are covered in this test, as positive token refresh
 * scenarios are assumed to be tested elsewhere.
 */
export async function test_api_visitor_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Malformed (obvious junk) token
  const malformedToken = RandomGenerator.alphabets(12); // purposely not a JWT or real visitor token

  // Step 2: Attempt refresh with malformed token
  await TestValidator.error(
    "refresh with malformed visitor_token must fail",
    async () => {
      await api.functional.auth.visitor.refresh(connection, {
        body: {
          visitor_token: malformedToken,
        } satisfies IDiscussionBoardVisitor.IRefresh,
      });
    },
  );

  // Step 3: Syntactically valid but non-existent token (e.g., looks like JWT)
  // Fake base64 string with correct JWT format (header.payload.signature)
  const fakeJwtToken = [
    RandomGenerator.alphaNumeric(12),
    RandomGenerator.alphaNumeric(16),
    RandomGenerator.alphaNumeric(32),
  ].join(".");

  await TestValidator.error(
    "refresh with fake but valid-looking JWT visitor_token must fail",
    async () => {
      await api.functional.auth.visitor.refresh(connection, {
        body: {
          visitor_token: fakeJwtToken,
        } satisfies IDiscussionBoardVisitor.IRefresh,
      });
    },
  );
}
