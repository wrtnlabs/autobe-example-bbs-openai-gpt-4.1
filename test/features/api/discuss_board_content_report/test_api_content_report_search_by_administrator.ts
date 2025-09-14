import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";
import type { IDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardContentReport";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMembers";
import type { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardContentReport";

/**
 * Validate administrator search for content reports by reporter_member_id.
 *
 * This test simulates the full lifecycle: admin creates two members
 * (author, reporter), author creates a post, reporter submits a content
 * report against the post, and finally admin retrieves all content reports
 * by that reporter_member_id.
 *
 * Steps:
 *
 * 1. Administrator joins (generates admin credentials).
 * 2. Admin logs in.
 * 3. Admin creates two member accounts: one for post author, one for reporter
 *    member.
 * 4. Author logs in and creates a post.
 * 5. Reporter logs in and files a content report targeting the author's post.
 * 6. Admin logs in.
 * 7. Admin PATCHes /discussBoard/administrator/contentReports with
 *    reporter_member_id filter.
 * 8. Validate that all returned reports are created by the reporter_member_id,
 *    and that the report previously submitted is present and has correct
 *    core fields (content_type, content_post_id, reason).
 */
export async function test_api_content_report_search_by_administrator(
  connection: api.IConnection,
) {
  // 1. Administrator joins
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

  // 2. Administrator logs in
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussBoardAdministrator.ILogin,
  });

  // 3. Administrator creates author member
  const authorAccountId = typia.random<string & tags.Format<"uuid">>();
  const authorNickname = RandomGenerator.name();
  const authorStatus = "active";
  const authorMember =
    await api.functional.discussBoard.administrator.members.create(connection, {
      body: {
        user_account_id: authorAccountId,
        nickname: authorNickname,
        status: authorStatus,
      } satisfies IDiscussBoardMembers.ICreate,
    });
  typia.assert(authorMember);

  // 4. Author joins (member join and login)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = RandomGenerator.alphabets(12) + "bB#";
  const authorConsent = [
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
  await api.functional.auth.member.join(connection, {
    body: {
      email: authorEmail,
      password: authorPassword,
      nickname: authorNickname,
      consent: authorConsent,
    } satisfies IDiscussBoardMember.IJoin,
  });
  await api.functional.auth.member.login(connection, {
    body: {
      email: authorEmail,
      password: authorPassword,
    } satisfies IDiscussBoardMember.ILogin,
  });

  // 5. Author creates a post
  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 12,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 20,
    sentenceMax: 30,
  });
  const post = await api.functional.discussBoard.member.posts.create(
    connection,
    {
      body: {
        title: postTitle,
        body: postBody,
      } satisfies IDiscussBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Reporter joins (member join and login)
  const reporterAccountId = typia.random<string & tags.Format<"uuid">>();
  const reporterNickname = RandomGenerator.name();
  const reporterStatus = "active";
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = RandomGenerator.alphabets(12) + "cC$";
  await api.functional.discussBoard.administrator.members.create(connection, {
    body: {
      user_account_id: reporterAccountId,
      nickname: reporterNickname,
      status: reporterStatus,
    } satisfies IDiscussBoardMembers.ICreate,
  });
  const reporterConsent = [
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
  await api.functional.auth.member.join(connection, {
    body: {
      email: reporterEmail,
      password: reporterPassword,
      nickname: reporterNickname,
      consent: reporterConsent,
    } satisfies IDiscussBoardMember.IJoin,
  });
  const reporterAuth = await api.functional.auth.member.login(connection, {
    body: {
      email: reporterEmail,
      password: reporterPassword,
    } satisfies IDiscussBoardMember.ILogin,
  });
  typia.assert(reporterAuth);

  // 7. Reporter submits a content report on author's post
  const reportReason = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 10,
    wordMax: 20,
  }).slice(0, 199);
  const contentReport =
    await api.functional.discussBoard.member.contentReports.create(connection, {
      body: {
        content_type: "post",
        content_post_id: post.id,
        reason: reportReason,
      } satisfies IDiscussBoardContentReport.ICreate,
    });
  typia.assert(contentReport);

  // 8. Administrator logs back in
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussBoardAdministrator.ILogin,
  });

  // 9. Administrator PATCHes /discussBoard/administrator/contentReports using reporter_member_id
  const reportsPage =
    await api.functional.discussBoard.administrator.contentReports.index(
      connection,
      {
        body: {
          reporter_member_id: contentReport.reporter_member_id,
        } satisfies IDiscussBoardContentReport.IRequest,
      },
    );
  typia.assert(reportsPage);
  // Validate that every report is by the reporter
  for (const report of reportsPage.data) {
    TestValidator.equals(
      "content report was created by the target reporter",
      report.reporter_member_id,
      contentReport.reporter_member_id,
    );
  }
  // Validate that the previously created report is present and correct core fields match
  const found = reportsPage.data.find((r) => r.id === contentReport.id);
  TestValidator.predicate(
    "reported content present in search result",
    typeof found !== "undefined",
  );
  if (found) {
    TestValidator.equals(
      "content_type is correct",
      found.content_type,
      contentReport.content_type,
    );
    TestValidator.equals(
      "content_post_id matches",
      found.content_post_id,
      contentReport.content_post_id ?? null,
    );
    TestValidator.equals("reason matches", found.reason, contentReport.reason);
  }
}

/**
 * - All steps of the scenario are implemented in business order:
 *
 *   1. Administrator joins and logs in.
 *   2. Administrator creates both author and reporter members.
 *   3. Author member joins, logs in, and creates a post.
 *   4. Reporter member joins, logs in, and submits a content report against the
 *        author's post.
 *   5. Admin logs back in and uses PATCH endpoint with reporter_member_id filter.
 * - All data randomization follows DTO constraints with correct formats.
 * - All API SDK calls have await. All typia.assert uses the correct return types.
 * - All request/response DTOs use exact shapes required.
 * - No prohibited patterns (no extra imports, no as any, no type error testing,
 *   etc.).
 * - TestValidator titles are all meaningful, non-generic, and always present as
 *   first parameter.
 * - All validations (content_type, content_post_id, reason, reporter_member_id
 *   match, report existence) use proper actual/expected value order.
 * - Null vs undefined correct on content_post_id from ISummary (always present as
 *   null or string).
 * - For-loop correctly validates all results for reporter_member_id matching.
 * - All required business steps, context switchings, consent handling, are
 *   correctly reflected in code and logic.
 * - No code is present for type errors, type testing, or non-existent property
 *   access.
 * - Function header, docstring, and structure perfectly match template and
 *   conventions.
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
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.1. Code Quality
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O No compilation errors
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O Step 4 revise COMPLETED
 */
const __revise = {};
__revise;
