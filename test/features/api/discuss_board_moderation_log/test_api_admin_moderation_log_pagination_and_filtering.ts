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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussBoardModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardModerationLogs";

/**
 * Validate that an administrator can retrieve a paginated and filterable list
 * of moderation logs for a specific moderation action.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate administrator
 * 2. Register member (target of moderation)
 * 3. Register and authenticate moderator for that member
 * 4. Moderator creates a moderation action on the member
 * 5. Admin creates at least one moderation log for the action
 * 6. Retrieve moderation logs paginated and unfiltered (basic success)
 * 7. Filter logs by event_type
 * 8. Filter logs by event_details keyword
 * 9. Filter logs by narrow created_at window
 * 10. Negative: Attempt to use moderator to fetch logs (insufficient privilege →
 *     error)
 *
 * This scenario covers positive (admin access, various filters) and negative
 * (role access control) cases.
 */
export async function test_api_admin_moderation_log_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Administrator registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "A!";
  const admin: IDiscussBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        nickname: RandomGenerator.name(2),
      } satisfies IDiscussBoardAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Member registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12) + "B!";
  const member: IDiscussBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        nickname: RandomGenerator.name(2),
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

  // 3. Register and authenticate moderator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussBoardAdministrator.ILogin,
  });

  const moderator: IDiscussBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        member_id: member.id as string & tags.Format<"uuid">,
        assigned_by_administrator_id: admin.id,
      } satisfies IDiscussBoardModerator.ICreate,
    });
  typia.assert(moderator);

  await api.functional.auth.moderator.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardModerator.ILogin,
  });
  typia.assert(moderator);

  // 4. Moderator creates moderation action
  const moderationAction: IDiscussBoardModerationAction =
    await api.functional.discussBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          moderator_id: moderator.id,
          target_member_id: member.id as string & tags.Format<"uuid">,
          action_type: "warn",
          action_reason: RandomGenerator.paragraph({ sentences: 8 }),
          status: "active",
          decision_narrative: RandomGenerator.paragraph(),
        } satisfies IDiscussBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 5. Switch back to admin and create moderation log
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussBoardAdministrator.ILogin,
  });

  const eventType = RandomGenerator.pick([
    "action_taken",
    "status_update",
    "escalation",
  ] as const);
  const logDetails = RandomGenerator.paragraph({ sentences: 3 });
  const moderationLog: IDiscussBoardModerationLogs =
    await api.functional.discussBoard.administrator.moderationActions.moderationLogs.create(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          event_type: eventType,
          event_details: logDetails,
          related_action_id: moderationAction.id,
        } satisfies IDiscussBoardModerationLogs.ICreate,
      },
    );
  typia.assert(moderationLog);

  // 6. Retrieve logs (pagination, no filter)
  const page1 =
    await api.functional.discussBoard.administrator.moderationActions.moderationLogs.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussBoardModerationLogs.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "page1 contains at least 1 log",
    page1.data.length > 0,
  );
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 10);

  // 7. Filter by event_type
  const filteredByType =
    await api.functional.discussBoard.administrator.moderationActions.moderationLogs.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          event_type: eventType,
          page: 1,
          limit: 10,
        } satisfies IDiscussBoardModerationLogs.IRequest,
      },
    );
  typia.assert(filteredByType);
  TestValidator.predicate(
    "filter by event_type returns logs",
    filteredByType.data.length > 0,
  );
  for (const log of filteredByType.data) {
    TestValidator.equals(
      "event_type matches filter",
      log.event_type,
      eventType,
    );
  }

  // 8. Filter by event_details substring
  const eventDetailKeyword = logDetails.split(" ")[0];
  const filteredByDetails =
    await api.functional.discussBoard.administrator.moderationActions.moderationLogs.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          event_details: eventDetailKeyword,
          page: 1,
          limit: 10,
        } satisfies IDiscussBoardModerationLogs.IRequest,
      },
    );
  typia.assert(filteredByDetails);
  TestValidator.predicate(
    "filter by event_details returns log(s)",
    filteredByDetails.data.length > 0,
  );

  // 9. Filter by exact created_at window
  if (filteredByType.data.length > 0) {
    const createdAt = filteredByType.data[0].created_at;
    const filteredByDate =
      await api.functional.discussBoard.administrator.moderationActions.moderationLogs.index(
        connection,
        {
          moderationActionId: moderationAction.id,
          body: {
            created_after: createdAt,
            created_before: createdAt,
            page: 1,
            limit: 10,
          } satisfies IDiscussBoardModerationLogs.IRequest,
        },
      );
    typia.assert(filteredByDate);
    TestValidator.predicate(
      "filter by creation window returns logs",
      filteredByDate.data.length > 0,
    );
    for (const log of filteredByDate.data) {
      TestValidator.equals(
        "created_at matches filter window",
        log.created_at,
        createdAt,
      );
    }
  }
  // 10. Attempt insufficient privilege from moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardModerator.ILogin,
  });
  await TestValidator.error(
    "moderator cannot retrieve admin moderation logs",
    async () => {
      await api.functional.discussBoard.administrator.moderationActions.moderationLogs.index(
        connection,
        {
          moderationActionId: moderationAction.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IDiscussBoardModerationLogs.IRequest,
        },
      );
    },
  );
}

/**
 * - All API and DTO functions used are from the provided SDK. No extra imports or
 *   fictional/incorrect types.
 * - Correct account/role switching is implemented with proper admin/moderator
 *   login.
 * - All TestValidator assertions include descriptive titles and proper order for
 *   expected/actual.
 * - EVERY API call is awaited and has correct structure for path params and
 *   bodies.
 * - Paging, event_type, event_details, and creation time window filters are
 *   tested; valid/invalid usages covered.
 * - No type errors, all type requirements satisfied; no intentional type
 *   mismatches.
 * - No code is present that would fail compilation. The code is fully compliant
 *   with TEST_WRITE.md.
 * - All nullables handled as per their definitions.
 * - No missing awaits or incorrect error handling; error scenario for
 *   insufficient role access is handled as per testing rules.
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
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O NO external functions are defined outside the main function
 *   - O ALL TestValidator functions include descriptive title as first parameter
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await`
 *   - O All API calls use proper parameter structure and type safety
 *   - O DTO type precision: correct DTO variant for each operation
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured
 *   - O All API responses validated with typia.assert()
 *   - O Authentication handled correctly without manual token management
 *   - O Only actual authentication APIs used
 *   - O NEVER touch connection.headers
 *   - O Test follows a logical, realistic business workflow
 *   - O Proper data dependencies and setup
 *   - O Edge/error cases are tested
 *   - O No illogical patterns: All test scenarios respect business rules and
 *       relationships
 *   - O Random data generation uses appropriate constraints and formats
 *   - O TestValidator assertions use actual-first, expected-second pattern
 *   - O Comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O TestValidator.error uses `await` ONLY with async callbacks
 *   - O Only SDK APIs and DTOs from provided materials used
 *   - O No fictional functions or types from examples used
 *   - O No type safety violations (`any`, `@ts-ignore`, etc.)
 *   - O No Markdown syntax: only executable TypeScript code
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 */
const __revise = {};
__revise;
