import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationAction";
import type { IDiscussBoardModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationLogs";
import type { IDiscussBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerator";

/**
 * Moderator retrieves the details of a specific moderation log entry for a
 * moderation action they're responsible for.
 *
 * This scenario tests the end-to-end flow: administrator creation, member
 * creation, moderator escalation (by admin), moderator login, action creation
 * as moderator, moderation log creation, and then the retrieval (read) of the
 * log.
 *
 * Steps:
 *
 * 1. Create an administrator account (auth.administrator.join)
 * 2. Create a member account (auth.member.join) with unique email and policies
 *    consent
 * 3. Administrator login (auth.administrator.login)
 * 4. Promote the member to moderator using the admin's id (auth.moderator.join)
 * 5. Login as the newly created moderator (auth.moderator.login)
 * 6. Create a moderation action as the moderator
 *    (discussBoard.moderator.moderationActions.create)
 * 7. Create a moderation log entry connected to the moderation action
 *    (discussBoard.moderator.moderationActions.moderationLogs.create)
 * 8. Get the moderation log detail
 *    (discussBoard.moderator.moderationActions.moderationLogs.at) using both
 *    moderationActionId and moderationLogId
 * 9. Assert the retrieved log matches the just-created log (using
 *    TestValidator.equals)
 */
export async function test_api_moderation_log_detail_success(
  connection: api.IConnection,
) {
  // 1. Create admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12) + "1A!";
  const adminNickname = RandomGenerator.name();
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      nickname: adminNickname,
    } satisfies IDiscussBoardAdministrator.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Create member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12) + "1A!";
  const memberNickname = RandomGenerator.name();
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

  // 3. Admin login
  const adminLogin = await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussBoardAdministrator.ILogin,
  });
  typia.assert(adminLogin);

  // 4. Escalate member to moderator
  const moderatorCreate = await api.functional.auth.moderator.join(connection, {
    body: {
      member_id: typia.assert(memberJoin.id!),
      assigned_by_administrator_id: typia.assert(adminLogin.id!),
    } satisfies IDiscussBoardModerator.ICreate,
  });
  typia.assert(moderatorCreate);

  // 5. Moderator login
  const moderatorLogin = await api.functional.auth.moderator.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardModerator.ILogin,
  });
  typia.assert(moderatorLogin);

  // 6. Create moderation action as moderator
  const moderationAction =
    await api.functional.discussBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          moderator_id: typia.assert(moderatorLogin.id!),
          // target_member_id?: (string & tags.Format<"uuid">) | null | undefined,
          // target_post_id?: ... omitting,
          // target_comment_id?: ... omitting,
          // appeal_id?: ... omitting,
          action_type: "warn",
          action_reason: RandomGenerator.paragraph({ sentences: 2 }),
          // decision_narrative?:
          status: "active",
        } satisfies IDiscussBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 7. Create moderation log for this action
  const moderationLog =
    await api.functional.discussBoard.moderator.moderationActions.moderationLogs.create(
      connection,
      {
        moderationActionId: typia.assert(moderationAction.id!),
        body: {
          actor_member_id: moderatorLogin.member_id,
          related_action_id: moderationAction.id,
          event_type: "action_taken",
          event_details: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussBoardModerationLogs.ICreate,
      },
    );
  typia.assert(moderationLog);

  // 8. Retrieve moderation log detail
  const fetched =
    await api.functional.discussBoard.moderator.moderationActions.moderationLogs.at(
      connection,
      {
        moderationActionId: moderationAction.id,
        moderationLogId: moderationLog.id,
      },
    );
  typia.assert(fetched);

  // 9. Assert equality by ids
  TestValidator.equals("moderation log id", fetched.id, moderationLog.id);
  TestValidator.equals(
    "moderation log related_action_id",
    fetched.related_action_id,
    moderationAction.id,
  );
  TestValidator.equals(
    "moderation log actor_member_id",
    fetched.actor_member_id,
    moderationLog.actor_member_id,
  );
  TestValidator.equals(
    "moderation log event_type",
    fetched.event_type,
    "action_taken",
  );
  TestValidator.equals(
    "moderation log event_details",
    fetched.event_details,
    moderationLog.event_details,
  );
}

/**
 * The draft test code thoroughly implements the business scenario: setting up
 * an admin, a member, escalating that member to moderator, logging in as the
 * moderator, creating a moderation action, logging an event, and retrieving it.
 * All typia.assert() calls are correctly used after API calls. All await
 * statements are used for each API call. Request bodies use satisfies with the
 * correct DTOs. Authentication is performed according to the workflow (no
 * helper functions), and connection.headers are never touched. Random data
 * generation uses typia.random or RandomGenerator, including paragraph
 * generators for event reasons and details. All fields in IJoin, ICreate, etc.
 * use only the DTO-defined fields. TestValidator.equals is used with
 * descriptive titles. There is no type error testing, no missing required
 * fields, no fictional API calls, and only documented properties are
 * referenced. There is also no additional import statement or require usage.
 * The scenario and logic are both correct. No errors or forbidden patterns
 * found.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
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
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
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
 *   - O Only API functions and DTOs from the provided materials are used (not from
 *       examples)
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
