import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate moderator update of an existing content moderation report.
 *
 * This test covers a workflow where a typical user reports a post, a moderator account reviews and updates the status of the report (e.g., resolving it with notes), and verifies correct state transitions. It also checks unauthorized update attempts by a non-moderator and tests business rule enforcement for status fields.
 *
 * Steps:
 * 1. Register a normal member to act as a content reporter.
 * 2. Create a new post as the reporter to generate content eligible for reporting.
 * 3. Reporter files a moderation report referencing the post (reason: 'offensive').
 * 4. Register a second member account to be the moderator; escalate this account via moderator assignment API.
 * 5. As the moderator, perform a report update: set status to 'resolved' with moderation notes. Validate response fields: status, resolution_notes, resolved_at, moderator_id.
 * 6. Confirm status/notes are reflected in the report entity.
 * 7. Edge: As a random unrelated member, attempt to perform a report update—should fail with a permission error.
 * 8. Edge: Send an update with an invalid status value (e.g., random nonsense)—should return a validation or workflow error.
 * 9. (Omit if not supported by API) Check that audit metadata (updated_at, resolved_at, moderator_id) matches update.
 */
export async function test_api_discussionBoard_test_update_report_status_and_resolution_as_moderator(
  connection: api.IConnection,
) {
  // 1. Register a normal content-reporting member
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: reporterEmail,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(reporter);

  // 2. Create a post as this reporter, mock a thread id
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const post: IDiscussionBoardPost = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: threadId,
      discussion_board_member_id: reporter.id,
      body: RandomGenerator.paragraph()(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post);

  // 3. Reporter files a moderation report referencing the post
  const report: IDiscussionBoardReport = await api.functional.discussionBoard.reports.post(connection, {
    body: {
      reporter_member_id: reporter.id,
      post_id: post.id,
      reason: "offensive",
    } satisfies IDiscussionBoardReport.ICreate,
  });
  typia.assert(report);

  // 4. Register moderator account and escalate privilege
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: moderatorEmail,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(moderator);

  const modAssignment = await api.functional.discussionBoard.moderators.post(connection, {
    body: {
      member_id: moderator.id,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(modAssignment);

  // 5. Moderator performs update on the report
  const updateResult: IDiscussionBoardReport = await api.functional.discussionBoard.reports.putById(connection, {
    id: report.id,
    body: {
      moderator_id: moderator.id,
      status: "resolved",
      resolution_notes: "Resolved with review.",
    } satisfies IDiscussionBoardReport.IUpdate,
  });
  typia.assert(updateResult);
  TestValidator.equals("report updated to resolved")(updateResult.status)("resolved");
  TestValidator.equals("resolution notes reflected")(updateResult.resolution_notes)("Resolved with review.");
  TestValidator.equals("moderator assigned")(updateResult.moderator_id)(moderator.id);
  TestValidator.predicate("resolved_at set")(!!updateResult.resolved_at);

  // 6. Confirm in report entity fields
  TestValidator.equals("status reflected")(updateResult.status)("resolved");
  TestValidator.equals("resolution notes reflected")(updateResult.resolution_notes)("Resolved with review.");

  // 7. Edge: unrelated member tries to update—should fail
  const unrelatedEmail = typia.random<string & tags.Format<"email">>();
  const unrelated: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: unrelatedEmail,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(unrelated);
  TestValidator.error("non-moderator update should fail")(async () => {
    await api.functional.discussionBoard.reports.putById(connection, {
      id: report.id,
      body: {
        moderator_id: unrelated.id,
        status: "resolved",
        resolution_notes: "Should not succeed.",
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  });

  // 8. Edge: invalid status value should fail
  TestValidator.error("invalid status value fails")(async () => {
    await api.functional.discussionBoard.reports.putById(connection, {
      id: report.id,
      body: {
        moderator_id: moderator.id,
        status: "not_real_status",
        resolution_notes: "Invalid status test.",
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  });
}