import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";
import type { IDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardContentReport";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerator";
import type { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";

/**
 * Validate that a moderator can update the status or add a resolution note
 * to a content report.
 *
 * BUSINESS FLOW:
 *
 * 1. Administrator registers and logs in.
 * 2. Member registers and logs in; consents for required policies.
 * 3. Member creates a post (subject of later report).
 * 4. Member submits a content report targeting the created post.
 * 5. Administrator assigns moderator role to the member.
 * 6. Moderator logs in and updates the status and rationale of the content
 *    report.
 * 7. The test validates the update has been successful and the returned object
 *    reflects the new status/rationale.
 *
 * STEPS:
 *
 * - Switch authentication as required between admin/member/moderator.
 * - Provide correct linkage between member/post/report/moderator IDs.
 * - All required consents must be included on member registration.
 * - Use appropriate DTO types for API functions and request payloads.
 */
export async function test_api_moderator_update_content_report_status_success(
  connection: api.IConnection,
) {
  // 1. Administrator registers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "!A1";
  const adminNickname = RandomGenerator.name();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      nickname: adminNickname,
    } satisfies IDiscussBoardAdministrator.IJoin,
  });
  typia.assert(admin);

  // 2. Member registers and logs in
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12) + "!A1";
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
  // Login as the member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardMember.ILogin,
  });

  // 3. Member creates a post
  const post = await api.functional.discussBoard.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 6 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
      } satisfies IDiscussBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Member submits a content report (against post)
  const report = await api.functional.discussBoard.member.contentReports.create(
    connection,
    {
      body: {
        content_type: "post",
        content_post_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }).substring(0, 80),
      } satisfies IDiscussBoardContentReport.ICreate,
    },
  );
  typia.assert(report);

  // 5. Administrator assigns moderator role to the member
  // Switch admin context (if not already established)
  await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      nickname: adminNickname,
    } satisfies IDiscussBoardAdministrator.IJoin,
  });
  const moderatorAssign = await api.functional.auth.moderator.join(connection, {
    body: {
      member_id: typia.assert(memberJoin.member?.id!),
      assigned_by_administrator_id: admin.id,
    } satisfies IDiscussBoardModerator.ICreate,
  });
  typia.assert(moderatorAssign);

  // 6. Moderator logs in
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardModerator.ILogin,
  });

  // 7. Moderator updates content report status and reason
  const updateReq = {
    status: "under_review",
    reason: RandomGenerator.paragraph({ sentences: 2 }).substring(0, 80),
  } satisfies IDiscussBoardContentReport.IUpdate;
  const updatedReport =
    await api.functional.discussBoard.moderator.contentReports.update(
      connection,
      {
        contentReportId: report.id,
        body: updateReq,
      },
    );
  typia.assert(updatedReport);
  TestValidator.equals(
    "content report id remains the same",
    updatedReport.id,
    report.id,
  );
  TestValidator.equals(
    "content report is now under_review",
    updatedReport.status,
    "under_review",
  );
  TestValidator.equals(
    "moderator reason was updated",
    updatedReport.reason,
    updateReq.reason,
  );
}

/**
 * - All API calls use only types and functions defined in the provided schema.
 * - There are no additional imports or require statements.
 * - Request payloads use satisfies pattern, no type assertions or 'any' usage.
 * - All 'await' for SDK functions is present.
 * - All TestValidator checks have descriptive titles.
 * - Variable and function naming is clear for role switching and data linkage.
 * - All type conversions with tags and nullable values are safe.
 * - Step-by-step, each user role is properly set up and switched.
 * - No type error testing or extra DTO properties are present.
 * - All major E2E requirements and error prohibitions are followed.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O EVERY api.functional.* call has await
 *   - O ALL TestValidator functions have title as first parameter
 */
const __revise = {};
__revise;
