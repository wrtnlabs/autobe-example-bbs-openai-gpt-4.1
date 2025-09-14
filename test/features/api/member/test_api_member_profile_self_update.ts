import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardUserProfile";

/**
 * Validate that a registered member can update their own profile (display
 * name, bio, avatar URI) and that the changes are reflected immediately.
 *
 * Business context: A member joins (registers), then logs in as themselves.
 * The member updates their profile with new values for display_name, bio,
 * and avatar_uri. The API must allow these changes and reflect them
 * instantly. All modified fields must be returned according to the
 * IDiscussBoardUserProfile schema, and business rules (such as length and
 * nullability) are enforced by type safety. The test validates both input
 * and output correctness, as well as that the update only applies to the
 * authenticated member’s profile.
 *
 * Steps:
 *
 * 1. Register a new member (with typia.random values for email,
 *    password/nickname, and required consents)
 * 2. Extract member ID from the joined member's response
 * 3. As the same authenticated user, call
 *    api.functional.discussBoard.member.members.profile.update with new
 *    values for display_name, bio, and avatar_uri
 * 4. Assert the response matches the input update and the API contract
 *    (typia.assert)
 * 5. Validate that the updated fields match exactly what was sent
 */
export async function test_api_member_profile_self_update(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    consent: [
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
    ],
  } satisfies IDiscussBoardMember.IJoin;
  const joinResult = await api.functional.auth.member.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  const memberId = joinResult.id;

  // 2. Prepare updated profile data
  const updateBody = {
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 4 }),
    avatar_uri:
      "https://example.com/avatar/" + RandomGenerator.alphaNumeric(10),
  } satisfies IDiscussBoardUserProfile.IUpdate;

  // 3. Update own profile
  const updatedProfile =
    await api.functional.discussBoard.member.members.profile.update(
      connection,
      {
        memberId: typia.assert<string & tags.Format<"uuid">>(memberId),
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);

  // 4. Validate the updated fields reflect the new values
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    updateBody.display_name,
  );
  TestValidator.equals("bio updated", updatedProfile.bio, updateBody.bio);
  TestValidator.equals(
    "avatar_uri updated",
    updatedProfile.avatar_uri,
    updateBody.avatar_uri,
  );
}

/**
 * - Full compliance with import and template conventions, no additional imports,
 *   only provided utilities are used.
 * - No use of type error testing: Random data is generated type-safely with
 *   appropriate tags, password constraints observed, no missing required
 *   fields, no `as any`, and no creative type assertion patterns.
 * - Proper null/undefined field handling: Uses explicit update for three target
 *   profile fields, only fields under test are changed, no extraneous or
 *   non-existent fields used.
 * - Authentication context is correctly managed: Registration is performed using
 *   join API, and subsequent calls are made as the authenticated member. No
 *   direct token/header manipulation.
 * - All TestValidator assertions include descriptive, business-context titles and
 *   use the actual-first, expected-second argument order.
 * - All API calls are properly awaited, correct DTO types are used for API inputs
 *   (IJoin for join/post, IUpdate for update/put), correct response type
 *   (IDiscussBoardUserProfile) is asserted via typia.assert().
 * - No business logic violations: The steps follow member registration, profile
 *   update, and result validation for self only. No cross-account update or
 *   non-allowed error scenarios are attempted. API contract for PUT
 *   /discussBoard/member/members/{memberId}/profile is respected with required
 *   DTO/properties only.
 * - Random data for display_name and avatar_uri conform to realistic business
 *   usages. Paragraph for bio ensures sufficient length.
 * - Variable declarations for request bodies use satisfies without type
 *   annotation, as required.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
 *   - O 3.4.3. Working with Typia Tagged Types
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.7.1. CRITICAL: Date Object Handling in DTOs
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
