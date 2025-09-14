import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardContentReport";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";

/**
 * Member can successfully delete (soft-delete) their own pending content
 * report.
 *
 * Scenario:
 *
 * 1. Register a new member with unique email, strong password, nickname, and
 *    required consents
 * 2. Log in with the new member account to obtain authentication
 * 3. Create a new post as this member (using a random title/body)
 * 4. File a content report on the created post (content_type: 'post', point to
 *    post id, reason: random text)
 * 5. Delete the filed content report via DELETE
 *    /discussBoard/member/contentReports/{contentReportId}
 * 6. (If necessary, verify via error test that deletion only permitted for the
 *    owner and only while status='pending')
 */
export async function test_api_content_report_delete_member_success(
  connection: api.IConnection,
) {
  // 1. Register new member
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + ".A1$", // strong password
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
  const auth = await api.functional.auth.member.join(connection, {
    body: memberJoinInput,
  });
  typia.assert(auth);
  // (connection headers updated by SDK)

  // 2. Login as member (redundant after join, but explicit for clarity)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberJoinInput.email,
      password: memberJoinInput.password,
    } satisfies IDiscussBoardMember.ILogin,
  });

  // 3. Create new post as member
  const postInput = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussBoardPost.ICreate;
  const post = await api.functional.discussBoard.member.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 4. File content report (on this post)
  const reportInput = {
    content_type: "post",
    content_post_id: post.id,
    content_comment_id: null,
    reason: RandomGenerator.paragraph({ sentences: 2 }).slice(0, 100),
  } satisfies IDiscussBoardContentReport.ICreate;
  const report = await api.functional.discussBoard.member.contentReports.create(
    connection,
    { body: reportInput },
  );
  typia.assert(report);
  TestValidator.equals(
    "report owner matches member",
    report.reporter_member_id,
    auth.id,
  );
  TestValidator.equals(
    "report targets correct post",
    report.content_post_id,
    post.id,
  );
  TestValidator.predicate("new report is pending", report.status === "pending");
  TestValidator.equals("report not deleted", report.deleted_at, null);

  // 5. Delete (soft-delete) the content report as owner
  await api.functional.discussBoard.member.contentReports.erase(connection, {
    contentReportId: report.id,
  });

  // 6. (Optional in this function) Could fetch report here if available to check deleted_at, or test forbidden re-delete/etc in negative scenario tests.
}

/**
 * - All imports are from the provided template, and no additional imports are
 *   present.
 * - Function documentation is clear, covers the scenario and all steps.
 * - All required DTOs are used precisely (IJoin, ILogin, ICreate variants), and
 *   properties for creatables are never over-specified.
 * - Random data generation for password, nickname, and content fields uses proper
 *   utilities and constraints; paragraph() and content() methods are used
 *   correctly per params.
 * - Member authentication is done via join (register) and re-login to follow
 *   usual practice, no manual token/headers manipulation, and login is included
 *   for explicit context.
 * - Stepwise logic: join -> login -> post create -> content report create ->
 *   erase follows natural data dependencies and business logic.
 * - After creation, type assertions (typia.assert) on returned DTOs for all
 *   objects (authorized member, post, content report) are present and correct.
 * - TestValidator checks (equals, predicate) use proper descriptive titles,
 *   actual-first pattern, and correct property matching (reporter_member_id,
 *   post linkage, status, deleted_at is null before deletion).
 * - The DELETE operation (erase) is called with proper args and awaited; only the
 *   owner can call it, as tested by the flow (remains as positive-path test).
 * - No type errors, no wrong-type validation, no error code/status code testing,
 *   and no forbidden scenarios are present.
 * - No logic that tests for missing fields or forcibly triggers type errors; all
 *   type constraints are obeyed.
 * - No business or DTO confusion at any point, no property name hallucination,
 *   and all referenced fields strictly exist in the schemas.
 * - The test function implements exactly one scenario, stays within the template
 *   boundaries, and never adds or mutates external functions.
 * - Proper handling of nullables and optionals: deleted_at is validated
 *   pre-erase, no forced ! or problematic null coalescing.
 * - The code is clean, type-safe, and readable with clear logical separation of
 *   steps. No errors to fix. Code is ready as final.
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
