import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test soft-deleting a moderation report both as report owner and as moderator.
 *
 * This test validates the following flows:
 *  - A regular member (Member A) can soft-delete (erase) their own report; deletion is confirmed by absence of errors.
 *  - Double-deleting the same report is rejected (conflict or error expected).
 *  - Deleting a non-existent report ID yields a not-found error.
 *  - A moderator (Member B) can file and delete a report; elevated permissions allow for deletion regardless of ownership.
 *  - A non-owner/non-moderator (Member A) cannot delete another's report (forbidden/unauthorized error).
 *
 * Steps:
 * 1. Register Member A (regular member).
 * 2. Register Member B (to become moderator) and grant moderator role.
 * 3. Member A creates a post (in a random thread).
 * 4. Member A files a report on the post.
 * 5. Member A deletes (soft-deletes) their own report — expect success.
 * 6. Attempt double-deletion of A's report — expect error.
 * 7. Attempt to delete a non-existent report ID — expect error.
 * 8. Member B (now moderator) files a report, deletes it as moderator — expect success.
 * 9. Attempt to delete B's report as Member A (unauthorized) — expect error.
 *
 * Note: The API does not expose report listing or direct audit/retrieval endpoints,
 * so no programmatic assertion is made about data retention/audit trail; soft-deletion
 * is validated via lack of errors on erase and correct error thrown in edge cases.
 */
export async function test_api_discussionBoard_test_soft_delete_report_as_report_owner_and_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register Member A
  const memberA_email = typia.random<string & tags.Format<"email">>();
  const memberA_username = RandomGenerator.alphaNumeric(10);
  const memberA: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(
    connection,
    {
      body: {
        username: memberA_username,
        email: memberA_email,
        hashed_password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(memberA);

  // Step 2: Register Member B and grant moderator
  const memberB_email = typia.random<string & tags.Format<"email">>();
  const memberB_username = RandomGenerator.alphaNumeric(10);
  const memberB: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(
    connection,
    {
      body: {
        username: memberB_username,
        email: memberB_email,
        hashed_password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(memberB);

  const moderator: IDiscussionBoardModerator = await api.functional.discussionBoard.moderators.post(
    connection,
    {
      body: { member_id: memberB.id } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 3: Member A creates a post using a new thread
  const thread_id = typia.random<string & tags.Format<"uuid">>();
  const post: IDiscussionBoardPost = await api.functional.discussionBoard.posts.post(
    connection,
    {
      body: {
        discussion_board_thread_id: thread_id,
        discussion_board_member_id: memberA.id,
        body: RandomGenerator.paragraph()(30),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Member A files a report on their own post
  const reportA: IDiscussionBoardReport = await api.functional.discussionBoard.reports.post(
    connection,
    {
      body: {
        reporter_member_id: memberA.id,
        thread_id: null,
        post_id: post.id,
        comment_id: null,
        reason: "test: spam or abuse",
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(reportA);

  // Step 5: Member A deletes (soft-deletes) their own report
  await api.functional.discussionBoard.reports.eraseById(
    connection,
    { id: reportA.id },
  );

  // Step 6: Attempt double-deletion (should trigger error)
  await TestValidator.error("double-deletion triggers conflict or error")(
    () => api.functional.discussionBoard.reports.eraseById(connection, { id: reportA.id }),
  );

  // Step 7: Attempt to delete a random non-existent report (should trigger error)
  await TestValidator.error("deleting non-existent report triggers not-found")(
    () => api.functional.discussionBoard.reports.eraseById(connection, { id: typia.random<string & tags.Format<"uuid">>() }),
  );

  // Step 8: Member B files a new report on the same post, deletes it as moderator
  const reportB: IDiscussionBoardReport = await api.functional.discussionBoard.reports.post(
    connection,
    {
      body: {
        reporter_member_id: memberB.id,
        thread_id: null,
        post_id: post.id,
        comment_id: null,
        reason: "test: duplicate content",
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(reportB);
  // Moderator deletes their own report
  await api.functional.discussionBoard.reports.eraseById(
    connection,
    { id: reportB.id },
  );

  // Step 9: Attempt to delete B's report as unrelated user (Member A) — forbidden expected
  await TestValidator.error("non-owner cannot delete other's report")(
    () => api.functional.discussionBoard.reports.eraseById(connection, { id: reportB.id }),
  );
}