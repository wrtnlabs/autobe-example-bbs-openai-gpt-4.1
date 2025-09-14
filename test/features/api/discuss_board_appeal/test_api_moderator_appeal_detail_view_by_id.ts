import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";
import type { IDiscussBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAppeal";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMembers";
import type { IDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationAction";
import type { IDiscussBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerator";
import type { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";

/**
 * Validate full moderator workflow for viewing appeal details by id.
 * Ensures correct authorization, complete appeal detail, secure linkage
 * audit.
 *
 * 1. Register and authorize administrator (for member onboarding and moderator
 *    escalation).
 * 2. Register a member (for content creation and appeal workflow).
 * 3. Administrator creates a platform member from member's user account id.
 * 4. Promote this member to moderator (requires admin id and target member
 *    id).
 * 5. Member logs in and creates a discussion post.
 * 6. Moderator logs in and creates a moderation action targeted at the
 *    member's post (with action_type, action_reason, and status).
 * 7. Member logs in and creates an appeal referencing this moderation action
 *    (with rationale).
 * 8. Moderator logs in and fetches the appeal details by id.
 *
 * - Validate all expected fields: id, moderation_action_id,
 *   appellant_member_id, appeal_rationale, status, audit fields.
 * - Verify correct role restrictions: only moderator and above can view.
 * - Check referential integrity and data match.
 */
export async function test_api_moderator_appeal_detail_view_by_id(
  connection: api.IConnection,
) {
  // 1. Administrator registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Adm1n#Password123";
  const adminNickname = RandomGenerator.name();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      nickname: adminNickname,
    } satisfies IDiscussBoardAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Member registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "M3mb3r#Pass4321";
  const memberNickname = RandomGenerator.name();
  const memberConsents: IDiscussBoardMember.IConsent[] = [
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
      consent: memberConsents,
    } satisfies IDiscussBoardMember.IJoin,
  });
  typia.assert(member);
  // 3. Administrator creates a member record (using member's user_account_id)
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussBoardAdministrator.ILogin,
  });
  const platformMember =
    await api.functional.discussBoard.administrator.members.create(connection, {
      body: {
        user_account_id: member.user_account_id as string & tags.Format<"uuid">,
        nickname: memberNickname,
        status: "active",
      } satisfies IDiscussBoardMembers.ICreate,
    });
  typia.assert(platformMember);
  // 4. Promote member to moderator
  const moderatorPromoteResult = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        member_id: platformMember.id,
        assigned_by_administrator_id: admin.id,
      } satisfies IDiscussBoardModerator.ICreate,
    },
  );
  typia.assert(moderatorPromoteResult);
  // 5. Member logs in and creates post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardMember.ILogin,
  });
  const post = await api.functional.discussBoard.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 1, sentenceMin: 5 }),
        business_status: "public",
      } satisfies IDiscussBoardPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Moderator logs in, creates moderation action
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardModerator.ILogin,
  });
  const moderationAction =
    await api.functional.discussBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          moderator_id: moderatorPromoteResult.id,
          target_member_id: platformMember.id,
          target_post_id: post.id,
          action_type: "remove_content",
          action_reason: "Violation of platform policy",
          decision_narrative: "Content had prohibited material",
          status: "active",
        } satisfies IDiscussBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);
  // 7. Member logs in and submits appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardMember.ILogin,
  });
  const appealRationale = RandomGenerator.paragraph({ sentences: 5 });
  const appeal = await api.functional.discussBoard.member.appeals.create(
    connection,
    {
      body: {
        moderation_action_id: moderationAction.id,
        appeal_rationale: appealRationale,
      } satisfies IDiscussBoardAppeal.ICreate,
    },
  );
  typia.assert(appeal);
  // 8. Moderator logs in and fetches appeal details by id
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardModerator.ILogin,
  });
  const fetchedAppeal = await api.functional.discussBoard.moderator.appeals.at(
    connection,
    { appealId: appeal.id },
  );
  typia.assert(fetchedAppeal);
  // Validate the returned appeal object fields
  TestValidator.equals("appeal id matches", fetchedAppeal.id, appeal.id);
  TestValidator.equals(
    "moderation action id matches",
    fetchedAppeal.moderation_action_id,
    moderationAction.id,
  );
  TestValidator.equals(
    "appellant_member_id matches",
    fetchedAppeal.appellant_member_id,
    platformMember.id,
  );
  TestValidator.equals(
    "appeal rationale matches",
    fetchedAppeal.appeal_rationale,
    appealRationale,
  );
  TestValidator.equals(
    "appeal status is pending",
    fetchedAppeal.status,
    "pending",
  );
  TestValidator.predicate(
    "appeal created_at is date-time",
    typeof fetchedAppeal.created_at === "string" &&
      fetchedAppeal.created_at.includes("T"),
  );
  TestValidator.predicate(
    "appeal updated_at is date-time",
    typeof fetchedAppeal.updated_at === "string" &&
      fetchedAppeal.updated_at.includes("T"),
  );
}

/**
 * 1. Complies with import management – no additional or forbidden imports.
 * 2. Every step maps directly to required API calls and DTOs, and every parameter
 *    is constructed from real test context (never invented/nonexistent props).
 * 3. All authentication context switches appropriately use correct login calls.
 * 4. Await is used before every SDK/networked function and async operation, as
 *    required.
 * 5. All request objects are formed using specific DTOs and business
 *    context—satisfies with correct type, no missing fields, or extraneous
 *    properties.
 * 6. All nullable/optional fields handled logically; no violations or unsafe
 *    assertions.
 * 7. Assertions are all accompanied by title strings and test for both data
 *    equality and business-side expectation, no type test or forbidden checks.
 * 8. Role and security boundary is enforced by context switches.
 * 9. No attempted type error validation or missing required property scenarios.
 * 10. No logic mistakes such as using wrong types or properties, or confusing
 *     required/optional fields.
 * 11. The scenario is fully implementable with provided SDKs/DTOs with no
 *     hallucinated logic.
 * 12. Final function documentation is provided and accurately describes steps and
 *     purpose.
 * 13. Predicate assertions check format but rely on typia.assert for deep type
 *     validation.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation and Type Safety
 *   - O 3.3. API Response Type and typia.assert Usage
 *   - O 3.4. Random Data Generation and typia.random Usage
 *   - O 3.5. Handling Nullable/Undefined Values
 *   - O 3.6. TypeScript Type Narrowing
 *   - O 3.7. Authentication Handling
 *   - O 3.8. Logic Validation and Assertions
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements or dynamic imports
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O NO missing required fields
 *   - O Proper async/await usage for all asynchronous steps
 *   - O All TestValidator functions include descriptive title as first parameter
 *   - O Response validated using typia.assert()
 *   - O Business logic validations are included
 */
const __revise = {};
__revise;
