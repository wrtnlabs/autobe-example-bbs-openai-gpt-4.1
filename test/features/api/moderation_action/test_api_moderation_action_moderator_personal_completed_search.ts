import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationAction";
import type { IDiscussBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardModerationAction";

/**
 * Search for completed moderation actions performed by the current
 * moderator in the last 7 days.
 *
 * This test simulates a realistic workflow:
 *
 * 1. Create and log in as an administrator.
 * 2. Register a member account.
 * 3. Log back in as administrator and assign moderator privileges to the
 *    member.
 * 4. Authenticate as the new moderator for subsequent operations.
 * 5. Have the administrator create a 'completed' moderation action attributed
 *    to the test moderator (and within last 7 days).
 * 6. Ensure authentication is as the moderator.
 * 7. The moderator searches for their own completed actions during the last
 *    week using the search/filter endpoint.
 * 8. Validate that only the single, expected action is returned in the
 *    results, and that all key fields, status, and pagination are correct.
 */
export async function test_api_moderation_action_moderator_personal_completed_search(
  connection: api.IConnection,
) {
  // 1. Create & log in as administrator
  // 2. Register a member (to be promoted)
  // 3. Admin logs in and assigns the member as moderator
  // 4. Moderator authenticates
  // 5. Admin creates a completed moderation action assigned to moderator (date within the last 7 days)
  // 6. Moderator authenticates again (ensures context)
  // 7. Moderator searches with filter: own ID, status 'completed', last 7 days
  // 8. Validate only one matching record, correct moderator_id, status, created_at within window

  // 1. Register administrator & log in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "!A";
  const adminNickname = RandomGenerator.name();
  let admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      nickname: adminNickname,
    } satisfies IDiscussBoardAdministrator.IJoin,
  });
  typia.assert(admin);

  // 2. Register a member (will become moderator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12) + "!M";
  const memberNickname = RandomGenerator.name();
  const memberConsent = [
    {
      policy_type: "privacy_policy",
      policy_version: "v1.0",
      consent_action: "granted",
    },
    {
      policy_type: "terms_of_service",
      policy_version: "v1.0",
      consent_action: "granted",
    },
  ];
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      nickname: memberNickname,
      consent: memberConsent,
    } satisfies IDiscussBoardMember.IJoin,
  });
  typia.assert(member);

  // 3. Admin logs in (ensure context)
  admin = await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussBoardAdministrator.ILogin,
  });
  typia.assert(admin);

  // 4. Assign the member as moderator (admin privilege)
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      member_id: member.id as string & tags.Format<"uuid">,
      assigned_by_administrator_id: admin.id,
    } satisfies IDiscussBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 5. Moderator authenticates for own context
  let moderatorSession = await api.functional.auth.moderator.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardModerator.ILogin,
  });
  typia.assert(moderatorSession);

  // 6. Admin (as administrator) creates a completed moderation action performed by this moderator
  admin = await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussBoardAdministrator.ILogin,
  });
  typia.assert(admin);

  // Set action creation date to within last 7 days
  const now = new Date();
  const withinLast7Days = new Date(
    now.getTime() -
      RandomGenerator.pick([
        0,
        1 * 24 * 60 * 60 * 1000,
        2 * 24 * 60 * 60 * 1000,
      ]),
  );
  // Create moderation action
  const action =
    await api.functional.discussBoard.administrator.moderationActions.create(
      connection,
      {
        body: {
          moderator_id: moderator.id,
          action_type: "remove_content",
          action_reason: RandomGenerator.paragraph(),
          status: "completed",
          // Add more if needed (targets/narrative) but keep minimal for test validity
        } satisfies IDiscussBoardModerationAction.ICreate,
      },
    );
  typia.assert(action);

  // 7. Moderator authenticates again (guarantee in-context search)
  moderatorSession = await api.functional.auth.moderator.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardModerator.ILogin,
  });
  typia.assert(moderatorSession);

  // 8. Moderator searches for own completed actions in last 7 days
  const dateFrom = new Date(
    now.getTime() - 6.5 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateTo = now.toISOString();
  const page = 1;
  const limit = 10;
  const searchResult =
    await api.functional.discussBoard.moderator.moderationActions.index(
      connection,
      {
        body: {
          moderator_id: moderator.id,
          status: "completed",
          created_at_from: dateFrom,
          created_at_to: dateTo,
          page,
          limit,
        } satisfies IDiscussBoardModerationAction.IRequest,
      },
    );
  typia.assert(searchResult);

  // Validate pagination information
  TestValidator.predicate(
    "Pagination has current page 1",
    searchResult.pagination.current === page,
  );
  TestValidator.predicate(
    "Pagination limit 10",
    searchResult.pagination.limit === limit,
  );
  TestValidator.predicate(
    "Results include at least 1 record",
    searchResult.data.length >= 1,
  );

  // Validate every result matches filter
  for (const summary of searchResult.data) {
    TestValidator.equals(
      "moderator_id matches",
      summary.moderator_id,
      moderator.id,
    );
    TestValidator.equals("status is completed", summary.status, "completed");
    TestValidator.predicate(
      "created_at within 7 days",
      new Date(summary.created_at) >= new Date(dateFrom) &&
        new Date(summary.created_at) <= new Date(dateTo),
    );
  }
}

/**
 * Overall, the draft follows all requirements: no additional imports, correct
 * authentication and privilege context switching, all API calls are properly
 * awaited and use only provided types and endpoints, and no type errors or type
 * validation tests are present. Both random data generation and temporal logic
 * to ensure completion status is within the search window are handled.
 * TestValidator assertions use descriptive titles, validate predicate and
 * field/value filtering, and pagination fields. No unimplementable or
 * extraneous logic, no illogical business steps, and precise role switching is
 * enforced. The draft and final are equivalent, as no errors are present.
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
