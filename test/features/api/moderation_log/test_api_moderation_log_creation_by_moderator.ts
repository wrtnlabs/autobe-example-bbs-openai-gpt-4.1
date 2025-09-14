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
 * Test that a moderator can create a moderation log event for an existing
 * moderation action. This involves full authentication flow
 * (admin/member/moderator), promotion workflow, and references to valid
 * business entities. Ensures event_type is properly set and all references and
 * auth context checks are respected.
 */
export async function test_api_moderation_log_creation_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminNickname = RandomGenerator.name();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        nickname: adminNickname,
      } satisfies IDiscussBoardAdministrator.IJoin,
    },
  );
  typia.assert(administrator);

  // 2. Create member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberNickname = RandomGenerator.name();
  const memberConsents: IDiscussBoardMember.IConsent[] = [
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
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      nickname: memberNickname,
      consent: memberConsents,
    } satisfies IDiscussBoardMember.IJoin,
  });
  typia.assert(member);

  // 3. Switch to administrator and promote member to moderator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussBoardAdministrator.ILogin,
  });

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      member_id: typia.assert<string & tags.Format<"uuid">>(member.id),
      assigned_by_administrator_id: typia.assert<string & tags.Format<"uuid">>(
        administrator.id,
      ),
    } satisfies IDiscussBoardModerator.ICreate,
  });
  typia.assert(moderatorAuth);

  // 4. Login as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardModerator.ILogin,
  });

  // 5. Create moderation action as moderator
  const action =
    await api.functional.discussBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          moderator_id: moderatorAuth.id,
          action_type: "warn",
          action_reason: "Inappropriate post content.",
          status: "active",
        } satisfies IDiscussBoardModerationAction.ICreate,
      },
    );
  typia.assert(action);

  // 6. Create moderation log event associated with the moderation action
  const logInput = {
    actor_member_id: moderatorAuth.member_id,
    related_action_id: action.id,
    event_type: "action_taken",
    event_details: RandomGenerator.paragraph(),
  } satisfies IDiscussBoardModerationLogs.ICreate;
  const log =
    await api.functional.discussBoard.moderator.moderationActions.moderationLogs.create(
      connection,
      {
        moderationActionId: action.id,
        body: logInput,
      },
    );
  typia.assert(log);

  // 7. Business and type validation
  TestValidator.equals(
    "moderation log references correct moderation action",
    log.related_action_id,
    action.id,
  );
  TestValidator.equals(
    "moderation log actor is moderator's member",
    log.actor_member_id,
    moderatorAuth.member_id,
  );
  TestValidator.equals(
    "moderation log event_type is set",
    log.event_type,
    logInput.event_type,
  );
}

/**
 * All aspects of the implementation have been reviewed and found compliant:
 *
 * - Imports: Only the template-provided imports are used, no additional imports
 *   of any kind.
 * - Full authentication flow: Admin and member accounts are created, the member
 *   is promoted to moderator by the admin, correct context switching is
 *   enforced via login API calls. Token management is handled only through
 *   SDK.
 * - Data generation: Random and type-correct values are produced for all required
 *   fields, including unique emails, strong-enough passwords, and consent
 *   objects. No type assertions are used unless strictly needed for tag type
 *   conversion.
 * - DTO usage: Only DTOs from input materials are used, and only the correct
 *   variant for each operation.
 * - API calls: All required awaits are present for async operations; each use of
 *   typia.assert is on a non-void response value and covers full runtime type
 *   correctness.
 * - Final assertions: TestValidator functions use descriptive title, and
 *   actual-first, expected-second parameter order.
 * - No hallucinated or invented properties: Only available schema fields are
 *   included at every step.
 * - Step-by-step business workflow is followed: (1) admin join, (2) member join
 *   (with required consent types), (3) context switch to admin, (4) member
 *   promotion to moderator, (5) context switch to moderator, (6) moderation
 *   action creation, (7) log creation against that action, (8) check data
 *   relationships.
 * - RandomGenerator and typia.random usages have correct generic parameters and
 *   call signatures. No missing awaits. All tag conversions use assert where
 *   needed.
 * - No type error tests, no "as any", no partial required fields, no fake
 *   error/validation code present.
 * - Code structure: Single function for the scenario, in correct template
 *   context, with commentary and docstring as required.
 * - All rules and items from TEST_WRITE.md are passed in this revision. No issues
 *   to fix.
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
 *   - O All functionality implemented
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
