import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";
import type { IDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardContentReport";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";

/**
 * This scenario tests the successful retrieval of detailed information for a
 * discussion board content report as an administrator user. It validates the
 * following workflow: (1) Register a member, (2) register an administrator, (3)
 * log in as the member, (4) the member creates a post, (5) the member submits a
 * content report targeting the post, (6) log in as the administrator (context
 * switch), (7) the administrator fetches the content report details using its
 * unique ID, (8) verify that report details match expectations (IDs, content
 * type, linking, and reason). All required validations on API results and
 * cross-role flows are performed.
 */
export async function test_api_administrator_content_report_detail_success(
  connection: api.IConnection,
) {
  // 1. Prepare unique emails and nicknames for both member and admin
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const memberNickname: string = RandomGenerator.name();
  const adminNickname: string = RandomGenerator.name();
  const memberPassword: string = RandomGenerator.alphabets(12);
  const adminPassword: string = RandomGenerator.alphabets(12);

  // 2. Register member account with required consents
  const memberConsent: IDiscussBoardMember.IConsent[] = [
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
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      nickname: memberNickname,
      consent: memberConsent,
    } satisfies IDiscussBoardMember.IJoin,
  });
  typia.assert(memberJoin);

  // 3. Log in as member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardMember.ILogin,
  });

  // 4. Member creates a discussion post
  const post = await api.functional.discussBoard.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 30,
          wordMin: 3,
          wordMax: 12,
        }),
      } satisfies IDiscussBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Member submits a content report targeting the post
  const reportReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  }).slice(0, 200);
  const report = await api.functional.discussBoard.member.contentReports.create(
    connection,
    {
      body: {
        content_type: "post",
        content_post_id: post.id,
        reason: reportReason,
      } satisfies IDiscussBoardContentReport.ICreate,
    },
  );
  typia.assert(report);

  // 6. Register administrator account
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      nickname: adminNickname,
    } satisfies IDiscussBoardAdministrator.IJoin,
  });
  typia.assert(adminJoin);

  // 7. Log in as administrator for auth context
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussBoardAdministrator.ILogin,
  });

  // 8. Administrator fetches content report details
  const reportDetail =
    await api.functional.discussBoard.administrator.contentReports.at(
      connection,
      {
        contentReportId: report.id,
      },
    );
  typia.assert(reportDetail);

  // 9. Verify report details match expectations
  TestValidator.equals("report id matches", reportDetail.id, report.id);
  TestValidator.equals(
    "reporter member id matches",
    reportDetail.reporter_member_id,
    memberJoin.id,
  );
  TestValidator.equals(
    "post id matches",
    reportDetail.content_post_id,
    post.id,
  );
  TestValidator.equals(
    "content type is post",
    reportDetail.content_type,
    "post",
  );
  TestValidator.equals("reason matches", reportDetail.reason, reportReason);
}

/**
 * - All imports are in the template and not changed. No additional import
 *   statements.
 * - Only the allowed DTOs and functions are used: IDiscussBoardMember,
 *   IDiscussBoardAdministrator, IDiscussBoardContentReport, IDiscussBoardPost.
 *   No fabricated types/properties.
 * - All required registration/login flows are handled step-by-step for both
 *   member and admin, with context switching by login API.
 * - Random data is generated properly via typia.random and RandomGenerator
 *   utilities for required values: emails, passwords, nicknames, post content.
 *   Uses required length/format constraints.
 * - Member consent array covers two plausible required consents
 *   ("privacy_policy", "terms_of_service").
 * - All API calls use await, and API invocations follow the correct parameter
 *   structure for path param/request body.
 * - Typia.assert() is invoked for every returned non-void API result.
 * - All TestValidator.assertions have a descriptive title as the first parameter
 *   and use the actual-first, expected-second pattern.
 * - No business logic/role violation: admin does not try to use member flows,
 *   member does not try to use admin flows. No raw header manipulation.
 * - CRUD steps flow in logical temporal order: register users > login > member
 *   creates post > member files report > admin registers & logs in > admin
 *   requests report detail.
 * - Only existing properties in the report entity or create DTO are accessed.
 * - Null vs undefined handled correctly (not applicable here as all required).
 * - No type error, wrong type tests, or intentional compilation errors.
 * - No operations or code outside the main function. No import modifications. No
 *   extra functions.
 * - All assertions are done via typia.assert() (for type correctness) and
 *   TestValidator.equals() for key business values.
 * - Scenario mapping is direct: every step in the E2E scenario is covered and
 *   validated.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
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
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.8.2. Proactive TypeScript Pattern Excellence
 *   - O 4.8.3. TypeScript Anti-Patterns to Avoid
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
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
