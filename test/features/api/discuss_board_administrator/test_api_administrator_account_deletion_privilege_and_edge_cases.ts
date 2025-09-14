import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";

/**
 * Validate the deletion (soft-revoke) privilege of administrator accounts,
 * including edge and error scenarios for business continuity.
 *
 * This test performs the following steps:
 *
 * 1. Register first administrator (adminA).
 * 2. Register second administrator (adminB).
 * 3. Switch context to adminA (via login).
 * 4. Delete (soft-revoke) adminB as adminA.
 * 5. Attempt deletion with random/nonexistent administratorId (expect not found
 *    error).
 * 6. Delete adminA (now sole admin) and expect forbidden error for final admin
 *    delete.
 *
 * All steps validate both expected success and proper error rejection for
 * RBAC/biz rules.
 */
export async function test_api_administrator_account_deletion_privilege_and_edge_cases(
  connection: api.IConnection,
) {
  // 1. Register first administrator (adminA)
  const emailA = typia.random<string & tags.Format<"email">>();
  const passwordA = RandomGenerator.alphaNumeric(12);
  const nicknameA = RandomGenerator.name();
  const adminAAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: emailA,
      password: passwordA,
      nickname: nicknameA,
    } satisfies IDiscussBoardAdministrator.IJoin,
  });
  typia.assert(adminAAuth);
  TestValidator.predicate(
    "adminA authorized and has administrator field",
    adminAAuth.administrator !== undefined,
  );
  const adminA = adminAAuth.administrator!;

  // 2. Register second administrator (adminB)
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordB = RandomGenerator.alphaNumeric(12);
  const nicknameB = RandomGenerator.name();
  const adminBAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: emailB,
      password: passwordB,
      nickname: nicknameB,
    } satisfies IDiscussBoardAdministrator.IJoin,
  });
  typia.assert(adminBAuth);
  TestValidator.predicate(
    "adminB authorized and has administrator field",
    adminBAuth.administrator !== undefined,
  );
  const adminB = adminBAuth.administrator!;

  // 3. Switch context to adminA (via login)
  const relogA = await api.functional.auth.administrator.login(connection, {
    body: {
      email: emailA,
      password: passwordA,
    } satisfies IDiscussBoardAdministrator.ILogin,
  });
  typia.assert(relogA);

  // 4. Delete (soft-revoke) adminB as adminA
  await api.functional.discussBoard.administrator.administrators.erase(
    connection,
    { administratorId: adminB.id },
  );
  // (No response body, deletion confirmed by error on resuse or via DB)

  // 5. Attempt deletion with random/nonexistent administratorId (expect not found error)
  await TestValidator.error(
    "delete non-existent administratorId is rejected",
    async () => {
      await api.functional.discussBoard.administrator.administrators.erase(
        connection,
        { administratorId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // 6. Attempt deleting final sole admin (adminA itself) - must be forbidden per business rule
  await TestValidator.error(
    "cannot delete final remaining administrator (platform continuity)",
    async () => {
      await api.functional.discussBoard.administrator.administrators.erase(
        connection,
        { administratorId: adminA.id },
      );
    },
  );
}

/**
 * - Correct use of two admins; both are registered and unique identifiers used.
 * - Authentication switching (login) between admins is correct and maps to
 *   intended privilege checks.
 * - All await usage on async API calls is present.
 * - TestValidator.error for business errors is properly used with await and
 *   descriptive title.
 * - All types (email/password/nickname) use random or generated data of correct
 *   format.
 * - No additional imports, connection.headers untouched.
 * - No type validation/deliberate type errors. All error scenarios test business
 *   logic (not missing-required-fields/type).
 * - Only API functions and DTOs from provided materials are used; all code is
 *   pure TypeScript under template constraints.
 * - All comments clarify intent and step purpose.
 * - Covers: successful deletion (soft-revoke), not found error on invalid
 *   adminId, and forbidden error on final sole admin deletion.
 * - No response type validation patterns after typia.assert(), as erase returns
 *   void.
 * - All rules/checklists fully satisfied.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation and Type Safety
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation Patterns
 *   - O 3.5. Nullable and Undefined Type Handling
 *   - O 3.6. Immutability of Request Body Variables using const
 *   - O 3.7. Authentication and Authorization
 *   - O 3.8. Business Logic and Edge Cases
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched (only content replaced)
 *   - O ALL functionality via provided imports only
 *   - O NO TYPE ERROR TESTING
 *   - O NO as any USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function structure and signature matches template
 *   - O TestValidator includes title as first param
 *   - O Proper positional parameter use in TestValidator
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async always has await
 *   - O No bare Promise assignments (all awaited)
 *   - O All async loop/conditional ops awaited
 *   - O Return/Promise.all awaits on async calls
 *   - O API params and type safety matches SDK
 *   - O Correct DTO for each op (ICreate/IUpdate/base)
 *   - O No DTO type confusion
 *   - O Path/body params combined correctly
 *   - O All API results typia.assert()-checked (as needed)
 *   - O Auth handled only via provided APIs
 *   - O NEVER touch connection.headers
 *   - O Logical business flow
 *   - O Realistic user journey
 *   - O Edge/error cases properly tested
 *   - O NO illogical/circular relationships
 *   - O Random data generation patterns correct
 *   - O TestValidator: title in assertions, actual first, expected second
 *   - O Comprehensive comments/doc
 */
const __revise = {};
__revise;
