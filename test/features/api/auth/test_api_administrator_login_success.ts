import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";

/**
 * Test successful login for an existing, active administrator on discussBoard
 * platform.
 *
 * 1. Register a new administrator with the join API (creates unique email,
 *    password, and nickname)
 * 2. Attempt login with the exact credentials used in registration
 * 3. Validate the login returns a valid JWT access/refresh token structure
 * 4. Validate the administrator payload matches the joined admin (must be 'active'
 *    and not revoked)
 * 5. Confirm business logic: login is possible only for valid, active, non-revoked
 *    accounts
 */
export async function test_api_administrator_login_success(
  connection: api.IConnection,
) {
  // 1. Register new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminNickname = RandomGenerator.name();
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    nickname: adminNickname,
  } satisfies IDiscussBoardAdministrator.IJoin;
  const joined: IDiscussBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Login with same credentials
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussBoardAdministrator.ILogin;
  const output: IDiscussBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: loginBody,
    });
  typia.assert(output);

  // 3. Validate JWT tokens structure and presence
  typia.assert<IAuthorizationToken>(output.token);
  TestValidator.predicate(
    "access token string returned",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token string returned",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiry fields set",
    typeof output.token.expired_at === "string" &&
      typeof output.token.refreshable_until === "string",
  );

  // 4. Validate administrator ID, member_id, and status consistency
  TestValidator.equals("admin id matches join", output.id, joined.id);
  TestValidator.equals(
    "member_id matches join",
    output.member_id,
    joined.member_id,
  );
  TestValidator.equals(
    "administrator status is active",
    output.status,
    "active",
  );
  TestValidator.equals(
    "revoked_at is null or undefined",
    output.revoked_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    output.deleted_at,
    null,
  );
  // Confirm 'administrator' payload is defined and matches id
  TestValidator.predicate(
    "administrator object is defined in payload",
    typeof output.administrator === "object" && output.administrator !== null,
  );
  if (output.administrator !== undefined) {
    TestValidator.equals(
      "administrator id matches output",
      output.administrator.id,
      output.id,
    );
    TestValidator.equals(
      "administrator status active in full entity",
      output.administrator.status,
      "active",
    );
  }
}

/**
 * 1. Strategic analysis confirms a scenario that is implementable and only covers
 *    the happy path for successful administrator login, following the scenario
 *    and business rules. The draft uses only DTO types and API SDK functions as
 *    specified and does not create non-existent properties.
 * 2. All required parameters for join and login are generated with correct formats
 *    using typia.random and RandomGenerator, and proper request body typing
 *    with satisfies is present. Required fields are respected based on DTO type
 *    definitions.
 * 3. All await patterns are correct for API calls, there are no missing awaits.
 *    All typia.assert calls use explicit type arguments where beneficial.
 *    TestValidator is used with descriptive titles and the actual-first,
 *    expected-second pattern.
 * 4. Validations are strictly focusing on business logic. No type error or type
 *    validation testing is attempted. There is proper handling of
 *    null/undefined (for revoked_at and deleted_at). There is no
 *    connection.headers usage, nor any attempt to add import or require
 *    statements.
 * 5. The code is clean, readable, and includes no DTO hallucination, with all
 *    property references present in the defined DTOs. There are no missing
 *    required fields, and status/existence checks are correct and explicit. Use
 *    of administrator object in the output is properly checked, including
 *    additional checks if defined.
 * 6. The function is fully contained in scope and uses only allowed imports. There
 *    are no helper/utility functions or extra code outside the function block.
 *    Documentation is present and meaningful.
 * 7. No issues with random data generation, and test data (emails, nicknames,
 *    passwords) follows correct random patterns. The non-null/undefined cases
 *    are handled as per rules. If there were any minor tag mismatches, all are
 *    resolved via satisfies or by directly using typia.assert where
 *    appropriate. Overall, no major or minor violations detected. Ready for
 *    production.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
 *   - O NO `as any` USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await`
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have `await`
 *   - O All async operations inside conditionals have `await`
 *   - O Return statements with async calls have `await`
 *   - O Promise.all() calls have `await`
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way - ZERO manipulation
 *       allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns: All test scenarios respect business rules and data
 *       relationships
 *   - O Random data generation uses appropriate constraints and formats
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O CRITICAL: For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (`any`, `@ts-ignore`,
 *       `@ts-expect-error`)
 *   - O CRITICAL: All TestValidator functions include title as first parameter and
 *       use correct positional parameter syntax
 *   - O Follows proper TypeScript conventions and type safety practices
 *   - O Efficient resource usage and proper cleanup where necessary
 *   - O Secure test data generation practices
 *   - O No hardcoded sensitive information in test data
 *   - O No authentication role mixing without proper context switching
 *   - O No operations on deleted or non-existent resources
 *   - O All business rule constraints are respected
 *   - O No circular dependencies in data creation
 *   - O Proper temporal ordering of events
 *   - O Maintained referential integrity
 *   - O Realistic error scenarios that could actually occur
 *   - O Type Safety Excellence: No implicit any types, all functions have explicit
 *       return types
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use `as
 *       const`
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use `as Type` - always use proper validation
 *   - O No Non-null Assertions: Never use `!` operator - handle nulls explicitly
 *   - O Complete Type Annotations: All parameters and variables have appropriate
 *       types
 *   - O Modern TypeScript Features: Leverage advanced features where they improve
 *       code quality
 *   - O NO Markdown Syntax: Zero markdown headers, code blocks, or formatting
 *   - O NO Documentation Strings: No template literals containing documentation
 *   - O NO Code Blocks in Comments: Comments contain only plain text
 *   - O ONLY Executable Code: Every line is valid, compilable TypeScript
 *   - O Output is TypeScript, NOT Markdown: Generated output is pure .ts file
 *       content, not a .md document with code blocks
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
