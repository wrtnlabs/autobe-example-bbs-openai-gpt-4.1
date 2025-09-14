import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardGuest";

/**
 * Validate end-to-end guest anonymous registration flow for discussBoard
 * platform analytics funnel.
 *
 * Ensures:
 *
 * - Required analytics fields (ip_address, user_agent) must be accepted
 * - Optional referer (origin URL) is handled for privacy/tracking (tested with
 *   non-null, null, and omitted)
 * - Proper guest id and JWT tokens issued after registration
 * - Correct return type and field constraints on response
 *
 * Steps:
 *
 * 1. Register guest with ip_address, user_agent, and referer (non-null)
 * 2. Assert IAuthorized structure, guest id and token fields, access/refresh
 *    formats
 * 3. Register guest with referer set to null (privacy minimization)
 * 4. Register guest omitting referer (undefined)
 * 5. All responses must be valid and include id, tokens, and proper dates
 */
export async function test_api_guest_join_success(connection: api.IConnection) {
  // 1. Guest join with referer as non-null string
  const ip_address = "203.0.113." + Math.floor(Math.random() * 255);
  const user_agent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0";
  const referer = "https://example.com/start";
  const bodyWithReferer = {
    ip_address,
    user_agent,
    referer,
  } satisfies IDiscussBoardGuest.ICreate;
  const guestWithReferer = await api.functional.auth.guest.join(connection, {
    body: bodyWithReferer,
  });
  typia.assert(guestWithReferer);
  TestValidator.predicate(
    "guest id exists (with referer)",
    typeof guestWithReferer.id === "string" && guestWithReferer.id.length > 0,
  );
  typia.assert(guestWithReferer.token);
  TestValidator.predicate(
    "access token is non-empty string (with referer)",
    typeof guestWithReferer.token.access === "string" &&
      guestWithReferer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string (with referer)",
    typeof guestWithReferer.token.refresh === "string" &&
      guestWithReferer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry is ISO (with referer)",
    typeof guestWithReferer.token.expired_at === "string" &&
      /T/.test(guestWithReferer.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO (with referer)",
    typeof guestWithReferer.token.refreshable_until === "string" &&
      /T/.test(guestWithReferer.token.refreshable_until),
  );

  // 2. Guest join with referer as null (explicit privacy-minimized)
  const bodyWithNullReferer = {
    ip_address,
    user_agent,
    referer: null,
  } satisfies IDiscussBoardGuest.ICreate;
  const guestWithNullReferer = await api.functional.auth.guest.join(
    connection,
    { body: bodyWithNullReferer },
  );
  typia.assert(guestWithNullReferer);
  TestValidator.predicate(
    "guest id exists (null referer)",
    typeof guestWithNullReferer.id === "string" &&
      guestWithNullReferer.id.length > 0,
  );
  typia.assert(guestWithNullReferer.token);
  TestValidator.predicate(
    "access token is non-empty string (null referer)",
    typeof guestWithNullReferer.token.access === "string" &&
      guestWithNullReferer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string (null referer)",
    typeof guestWithNullReferer.token.refresh === "string" &&
      guestWithNullReferer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry is ISO (null referer)",
    typeof guestWithNullReferer.token.expired_at === "string" &&
      /T/.test(guestWithNullReferer.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO (null referer)",
    typeof guestWithNullReferer.token.refreshable_until === "string" &&
      /T/.test(guestWithNullReferer.token.refreshable_until),
  );

  // 3. Guest join with referer omitted (undefined)
  const bodyWithOmittedReferer = {
    ip_address,
    user_agent,
    // referer deliberately left undefined
  } satisfies IDiscussBoardGuest.ICreate;
  const guestWithOmittedReferer = await api.functional.auth.guest.join(
    connection,
    { body: bodyWithOmittedReferer },
  );
  typia.assert(guestWithOmittedReferer);
  TestValidator.predicate(
    "guest id exists (omitted referer)",
    typeof guestWithOmittedReferer.id === "string" &&
      guestWithOmittedReferer.id.length > 0,
  );
  typia.assert(guestWithOmittedReferer.token);
  TestValidator.predicate(
    "access token is non-empty string (omitted referer)",
    typeof guestWithOmittedReferer.token.access === "string" &&
      guestWithOmittedReferer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string (omitted referer)",
    typeof guestWithOmittedReferer.token.refresh === "string" &&
      guestWithOmittedReferer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry is ISO (omitted referer)",
    typeof guestWithOmittedReferer.token.expired_at === "string" &&
      /T/.test(guestWithOmittedReferer.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO (omitted referer)",
    typeof guestWithOmittedReferer.token.refreshable_until === "string" &&
      /T/.test(guestWithOmittedReferer.token.refreshable_until),
  );
}

/**
 * - The draft implementation successfully follows the scenario requirements and
 *   code standards.
 * - All required fields for the guest join endpoint are correctly constructed,
 *   including variations of the optional referer (set, null, omitted).
 * - All return values are validated via typia.assert() as required.
 * - TestValidator.predicate includes descriptive titles and uses the actual-first
 *   pattern.
 * - All API calls use await.
 * - Only provided DTO types and functions are used, there is no type error
 *   testing, and no additional imports were added.
 * - The only suggested improvement is slightly enhancing the description in the
 *   JSDoc for coverage clarity and adding individual token field assertions for
 *   each test variation.
 * - No prohibited patterns or issues to fix. The code is compilation-safe and
 *   conforms to all requirements.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
 *   - O 2. Input Materials Provided
 *   - O 3.0. Critical Requirements and Type Safety
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
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
