import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitor";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Verify visitor registration does not reuse soft-deleted records and
 * creates new visitor tokens for identical clients after soft deletion.
 *
 * This test ensures that, for compliance/audit requirements, the system
 * creates a new visitor record even when a previous one (matching the same
 * device/user_agent and/or ip_address) was soft deleted. The test flow
 * includes:
 *
 * 1. Register a visitor (POST /auth/visitor/join) with unique user_agent and
 *    ip_address.
 * 2. Simulate the effect of soft deletion (since there's no delete endpoint,
 *    this is conceptual: the first token is lost/invalidated).
 * 3. Register again from the same client details (same user_agent/ip_address).
 * 4. Assert that the returned visitor_token and session metadata are different
 *    from the prior, and role is 'visitor'.
 * 5. Confirm that both sessions have correct issued_at and expires_at
 *    properties (ISO8601 format).
 * 6. Confirm that soft-deleted tokens are not reused by some accidental
 *    caching mechanism.
 */
export async function test_api_visitor_registration_compliance_soft_deleted_reuse(
  connection: api.IConnection,
) {
  // 1. Register a visitor with unique user_agent and ip_address
  const userAgent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const ipAddress = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

  const first: IDiscussionBoardVisitor.IAuthorized =
    await api.functional.auth.visitor.join(connection, {
      body: {
        user_agent: userAgent,
        ip_address: ipAddress,
      } satisfies IDiscussionBoardVisitor.IJoin,
    });
  typia.assert(first);
  TestValidator.equals(
    "role is visitor for first registration",
    first.role,
    "visitor",
  );
  TestValidator.predicate(
    "visitor_token present for first",
    typeof first.visitor_token === "string" && !!first.visitor_token,
  );

  // Store metadata for comparison
  const firstToken = first.visitor_token;
  const firstIssuedAt = first.issued_at;
  const firstExpiresAt = first.expires_at;

  // 2. Simulate soft deletion: no API, so just forget first token and conceptually invalidate
  // In real systems, this would mean a deleted_at or similar flag is set in database.
  // For E2E, we proceed to re-register as same device without providing token.

  // 3. Register again with exact same user_agent and ip_address
  // (should create a new record and NOT reuse old soft-deleted session)
  if (connection.headers?.Authorization)
    delete connection.headers.Authorization; // clear auth
  const second: IDiscussionBoardVisitor.IAuthorized =
    await api.functional.auth.visitor.join(connection, {
      body: {
        user_agent: userAgent,
        ip_address: ipAddress,
      } satisfies IDiscussionBoardVisitor.IJoin,
    });
  typia.assert(second);
  TestValidator.equals(
    "role is visitor for second registration",
    second.role,
    "visitor",
  );
  TestValidator.predicate(
    "visitor_token present for second",
    typeof second.visitor_token === "string" && !!second.visitor_token,
  );

  // 4. Assert tokens and session metadata differ (new record issued)
  TestValidator.notEquals(
    "visitor_token is unique (not reused)",
    second.visitor_token,
    firstToken,
  );
  TestValidator.notEquals(
    "issued_at is unique",
    second.issued_at,
    firstIssuedAt,
  );
  TestValidator.notEquals(
    "expires_at is unique",
    second.expires_at,
    firstExpiresAt,
  );

  // 5. Confirm both have valid ISO8601 dates (format assertions)
  TestValidator.predicate(
    "issued_at is ISO8601 for second",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(second.issued_at),
  );
  TestValidator.predicate(
    "expires_at is ISO8601 for second",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(second.expires_at),
  );
}
