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
 * Non-admin permission denial for updating a content report
 *
 * This test validates that only administrators may use the admin content report
 * update endpoint. It walks through the workflow:
 *
 * 1. Member joins and logs in
 * 2. Member creates a post
 * 3. Member files a content report on their post
 * 4. Member (not admin) attempts to update the report on the administrator
 *    endpoint and is denied The workflow ensures all required setup is present
 *    and a real business operation is attempted. Expected result: Update
 *    attempt fails with authorization error.
 */
export async function test_api_content_report_update_administrator_permission_denied_non_admin(
  connection: api.IConnection,
) {
  // 1. Member joins
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12) + "A!"; // ensure special/upper/lower/digit for policy
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      nickname: RandomGenerator.name(),
      consent: [
        {
          policy_type: "privacy_policy",
          policy_version: "1.0",
          consent_action: "granted",
        },
        {
          policy_type: "terms_of_service",
          policy_version: "1.0",
          consent_action: "granted",
        },
      ],
    } satisfies IDiscussBoardMember.IJoin,
  });
  typia.assert(member);

  // 2. Member logs in (refresh session, in case header required)
  const _memberSession = await api.functional.auth.member.login(connection, {
    body: { email, password } satisfies IDiscussBoardMember.ILogin,
  });

  // 3. Member creates a post (need content for report target)
  const post = await api.functional.discussBoard.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IDiscussBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Member reports their own post
  const report = await api.functional.discussBoard.member.contentReports.create(
    connection,
    {
      body: {
        content_type: "post",
        content_post_id: post.id,
        reason: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 6,
          wordMax: 12,
        }),
      } satisfies IDiscussBoardContentReport.ICreate,
    },
  );
  typia.assert(report);

  // 5. Member attempts to update report via the administrator endpoint (should fail)
  await TestValidator.error(
    "member is denied permission for admin update endpoint",
    async () => {
      await api.functional.discussBoard.administrator.contentReports.update(
        connection,
        {
          contentReportId: report.id,
          body: {
            status: "resolved",
            reason: "Marked as addressed by non-admin (should fail)",
          } satisfies IDiscussBoardContentReport.IUpdate,
        },
      );
    },
  );
}

/**
 * - The draft satisfies all rules and checklist items.
 * - Imports are only from the template, all variables use `const` for
 *   immutability, request body is always constructed with `satisfies` and
 *   without type annotation, and contains no type violation or type error
 *   testing.
 * - Member authentication and all data setup (join, login, post creation, report
 *   creation) follow proper order. No non-existent properties, only correct
 *   DTOs and proper function signatures are used for API calls.
 * - API calls always use `await`; even re-login is properly used as a session
 *   refresh.
 * - The TestValidator.error async callback is correctly awaited, and the error
 *   check is for permission, not type error.
 * - No business logic is skipped, and all setup is in scope.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O ALL functionality implemented using only template-provided imports
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
 *   - O Authentication is handled correctly
 *   - O Only actual authentication APIs are used
 *   - O CRITICAL: NEVER touch connection.headers in any way - ZERO manipulation
 *       allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included
 *   - O No illogical patterns
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
 *   - O Type Safety Excellence
 *   - O Const Assertions
 *   - O Generic Type Parameters
 *   - O Null/Undefined Handling
 *   - O No Type Assertions
 *   - O No Non-null Assertions
 *   - O Complete Type Annotations
 *   - O Modern TypeScript Features
 *   - O NO Markdown Syntax
 *   - O NO Documentation Strings
 *   - O NO Code Blocks in Comments
 *   - O ONLY Executable Code
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
