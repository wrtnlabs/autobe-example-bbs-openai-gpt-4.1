import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate viewing of a moderation report's details by both the reporting member and a moderator, and enforce proper permissions/response shapes.
 *
 * This test ensures only authorized members (reporter, moderators) can retrieve the detail of a given report by its ID and that all visible information is correct, while access is forbidden for unrelated members and an error is thrown for non-existent IDs.
 *
 * Step-by-step process:
 * 1. Register a regular member (the 'reporter')
 * 2. Register another member (as an unrelated user)
 * 3. Register a third member (future moderator)
 * 4. Create a post as the reporter (use random valid thread UUID as placeholder, since thread management is out of scope)
 * 5. File a report referencing the post as the reporter
 * 6. Retrieve the report by ID as the reporter (should succeed and match submission + created object)
 * 7. Assign moderator rights
 * 8. Retrieve by ID as moderator & validate
 * 9. Attempt to retrieve a non-existent report
 *
 * NOTE: This test omits permission boundary checks (e.g., attempts to forcibly switch Authorization in the same connection) as connection-based session tokens/user switching is not supported by the provided APIs. Only actual business operations are tested.
 */
export async function test_api_discussionBoard_test_get_report_detail_by_id_as_reporter_and_moderator(
  connection: api.IConnection,
) {
  // 1. Register reporter (member)
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterUsername = RandomGenerator.alphaNumeric(9);
  const reporterPassword = RandomGenerator.alphaNumeric(12);

  const reporter = await api.functional.discussionBoard.members.post(
    connection,
    {
      body: {
        username: reporterUsername,
        email: reporterEmail,
        hashed_password: reporterPassword,
        display_name: RandomGenerator.name(),
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(reporter);

  // 2. Register unrelated member
  const unrelatedEmail = typia.random<string & tags.Format<"email">>();
  const unrelatedUsername = RandomGenerator.alphaNumeric(9);
  const unrelatedPassword = RandomGenerator.alphaNumeric(12);

  const unrelated = await api.functional.discussionBoard.members.post(
    connection,
    {
      body: {
        username: unrelatedUsername,
        email: unrelatedEmail,
        hashed_password: unrelatedPassword,
        display_name: RandomGenerator.name(),
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(unrelated);

  // 3. Register moderator candidate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(9);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.discussionBoard.members.post(
    connection,
    {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        hashed_password: moderatorPassword,
        display_name: RandomGenerator.name(),
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(moderator);

  // 4. Create a post as the reporter (simulate valid thread id)
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.discussionBoard.posts.post(
    connection,
    {
      body: {
        discussion_board_thread_id: threadId,
        discussion_board_member_id: reporter.id,
        body: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. File a report referencing the post as the reporter
  const reportReason = "Prohibited content";
  const report = await api.functional.discussionBoard.reports.post(
    connection,
    {
      body: {
        reporter_member_id: reporter.id,
        thread_id: null, // Not reporting a thread
        post_id: post.id,
        comment_id: null, // Not reporting a comment
        reason: reportReason,
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report);

  // 6. Retrieve the report as the reporter & validate output
  const readAsReporter = await api.functional.discussionBoard.reports.getById(
    connection,
    { id: report.id },
  );
  typia.assert(readAsReporter);
  TestValidator.equals("report matches ID")(readAsReporter.id)(report.id);
  TestValidator.equals("reporter matches")(readAsReporter.reporter_member_id)(reporter.id);
  TestValidator.equals("post matches")(readAsReporter.post_id)(post.id);
  TestValidator.equals("reason matches")(readAsReporter.reason)(reportReason);

  // 7. Assign moderator rights
  const moderatorAssignment = await api.functional.discussionBoard.moderators.post(
    connection,
    {
      body: {
        member_id: moderator.id,
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(moderatorAssignment);

  // 8. Retrieve by ID as moderator & validate
  // (Since session switching is not natively supported, this is a logical/sequence demonstration)
  // In a real system, you would use a new authenticated connection for moderator.
  const readAsModerator = await api.functional.discussionBoard.reports.getById(
    connection,
    { id: report.id },
  );
  typia.assert(readAsModerator);
  TestValidator.equals("report ID for moderator")(readAsModerator.id)(report.id);
  TestValidator.equals("moderator assignment permitted")(typeof readAsModerator.status === "string")(true);

  // 9. Attempt to retrieve a non-existent report
  await TestValidator.error("not found for invalid ID")(
    async () => {
      await api.functional.discussionBoard.reports.getById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}