import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";

/**
 * Attempts to register two members with the same email and validates that the
 * second attempt fails due to the unique email constraint.
 *
 * 1. Register the first member with a randomly-generated email, strong password,
 *    random nickname, and required consents.
 * 2. Attempt to register a second member with the exact same email and valid
 *    password/nickname/consents.
 * 3. Assert that the second registration fails, confirming duplicate email
 *    constraint is enforced.
 */
export async function test_api_member_join_duplicate_email_failure(
  connection: api.IConnection,
) {
  // 1. Generate unique email and other required registration fields
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12) + "A!"; // Ensure minimum requirements by adding uppercase and special char
  const nickname1 = RandomGenerator.name();
  const nickname2 = RandomGenerator.name(); // second nickname can be different
  const consent: IDiscussBoardMember.IConsent[] = [
    {
      policy_type: "privacy_policy",
      policy_version: "v1",
      consent_action: "granted",
    },
    {
      policy_type: "terms_of_service",
      policy_version: "v1",
      consent_action: "granted",
    },
  ];

  // 2. Register the first member
  const firstResult = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      nickname: nickname1,
      consent,
    } satisfies IDiscussBoardMember.IJoin,
  });
  typia.assert(firstResult);

  // 3. Attempt to register a second member with the same email (unique email policy)
  await TestValidator.error(
    "duplicate email registration attempt fails",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email, // same email as before
          password,
          nickname: nickname2,
          consent,
        } satisfies IDiscussBoardMember.IJoin,
      });
    },
  );
}

/**
 * Code review for duplicate email E2E test function:\n\n- The function is
 * implemented under the correct name and template, using only provided imports.
 * No extra imports or require statements detected.\n- Functionality:\n -
 * Generates random compliant email and password with explicit strong password
 * (including uppercase and special character to meet MinLength<10> and typical
 * complexity requirements).\n - Consents use defined and required consents for
 * 'privacy_policy' and 'terms_of_service', matching business requirements from
 * DTO docs.\n - Joins once (unique) and asserts result with typia.assert
 * (proper API, correct DTO variant IJoin for create/join).\n - Error
 * validation: Attempts to join with same email, expects/awaits error, using
 * TestValidator.error with clear, descriptive title (parameter order and
 * asynchrony correct).\n- All API function calls
 * (`api.functional.auth.member.join`) are properly awaited. No bare Promise
 * assignments. Error expectation correctly uses await on async callback in
 * TestValidator.error.\n- No business logic or domain violations; no type
 * errors, wrong types, or as any. \n- All variable declarations use const and
 * type inference, especially for request body (satisfies pattern only, no type
 * annotations).\n- No extra properties or unnecessary business logic; only
 * schema-defined properties used and at proper hierarchy.\n- Function parameter
 * and return signatures match requirements. No external or helper functions.\n-
 * Titles for TestValidator calls make the business purpose clear; all
 * assertions use actual-value first pattern.\n\nResult: Code is precise,
 * correct, schema-compliant and matches both descriptive and technical
 * requirements. No placement, type, or semantic errors found. Nothing extra or
 * missing in logic or properties. No further fix or deletion required. All
 * rules and checklist items satisfied.\n\n
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
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
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
 *   - O DTO type precision - Using correct DTO variant for each operation (e.g.,
 *       ICreate for POST, IUpdate for PUT, base type for GET)
 *   - O No DTO type confusion - Never mixing IUser with IUser.ISummary or IOrder
 *       with IOrder.ICreate
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
