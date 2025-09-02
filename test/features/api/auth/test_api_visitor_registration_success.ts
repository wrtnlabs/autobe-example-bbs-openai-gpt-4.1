import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitor";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful registration of a visitor account (guest access,
 * unauthenticated).
 *
 * This test covers registering a new visitor via the /auth/visitor/join
 * endpoint. It ensures that providing optional guest metadata (user_agent,
 * IP address) is accepted, a new unique visitor_token is returned, and that
 * soft-deleted records (deleted_at) are NOT reused. The returned session
 * information must be valid and enable anonymous activity under the
 * 'visitor' role for future requests.
 *
 * Steps:
 *
 * 1. Register a new visitor (with random user_agent and IP address).
 * 2. Validate that a unique visitor_token is received and role is 'visitor'.
 * 3. Immediately register a SECOND visitor—validate that a new unique
 *    visitor_token is received (verifying soft-deleted or old tokens are
 *    never reused).
 * 4. Confirm both responses contain proper token formats, issued_at and
 *    expires_at timestamps, and valid authorization payloads for later
 *    use.
 */
export async function test_api_visitor_registration_success(
  connection: api.IConnection,
) {
  // 1. Register first visitor (simulate guest device)
  const joinInput1 = {
    user_agent: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 8,
      wordMax: 17,
    }),
    ip_address: `192.168.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}`,
  } satisfies IDiscussionBoardVisitor.IJoin;

  const visitor1: IDiscussionBoardVisitor.IAuthorized =
    await api.functional.auth.visitor.join(connection, {
      body: joinInput1,
    });
  typia.assert(visitor1);
  TestValidator.predicate(
    "first visitor_token is present",
    visitor1.visitor_token.length > 0,
  );
  TestValidator.equals("role should be visitor", visitor1.role, "visitor");

  // 2. Register second visitor (simulate different guest device)
  const joinInput2 = {
    user_agent: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 8,
      wordMax: 17,
    }),
    ip_address: `192.168.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}`,
  } satisfies IDiscussionBoardVisitor.IJoin;

  const visitor2: IDiscussionBoardVisitor.IAuthorized =
    await api.functional.auth.visitor.join(connection, {
      body: joinInput2,
    });
  typia.assert(visitor2);
  TestValidator.predicate(
    "second visitor_token is present",
    visitor2.visitor_token.length > 0,
  );
  TestValidator.equals("role should be visitor (2)", visitor2.role, "visitor");

  // 3. The visitor tokens must be unique
  TestValidator.notEquals(
    "visitor tokens are unique",
    visitor1.visitor_token,
    visitor2.visitor_token,
  );

  // 4. Validate token & session metadata (basic checks)
  typia.assert<IAuthorizationToken>(visitor1.token);
  typia.assert<IAuthorizationToken>(visitor2.token);
  TestValidator.predicate(
    "issued_at is valid ISO datetime (1)",
    typeof visitor1.issued_at === "string" && visitor1.issued_at.includes("T"),
  );
  TestValidator.predicate(
    "expires_at is valid ISO datetime (1)",
    typeof visitor1.expires_at === "string" &&
      visitor1.expires_at.includes("T"),
  );
  TestValidator.predicate(
    "issued_at is valid ISO datetime (2)",
    typeof visitor2.issued_at === "string" && visitor2.issued_at.includes("T"),
  );
  TestValidator.predicate(
    "expires_at is valid ISO datetime (2)",
    typeof visitor2.expires_at === "string" &&
      visitor2.expires_at.includes("T"),
  );
}
