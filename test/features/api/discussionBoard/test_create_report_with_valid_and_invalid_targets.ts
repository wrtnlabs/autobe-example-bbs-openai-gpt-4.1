import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test creating moderation reports on threads, posts, and comments, including failure cases for non-existent targets, duplicates,
 * and unprivileged members, as well as guest/unauthenticated access.
 *
 * This function verifies:
 *   1. A valid member can submit reports on threads, posts, and comments they do not own.
 *   2. Reporting fails for invalid (non-existent) thread, post, or comment ids.
 *   3. Duplicate report (same member, same target) is prevented.
 *   4. After banning/soft-deleting a member account, reporting is forbidden for that member.
 *   5. Guests/unauthenticated users cannot create reports.
 *
 * Steps:
 *   1. Register a member (Member1)
 *   2. Register a second member (Member2) to be the owner of target content
 *   3. Member2 creates a thread
 *   4. Member2 creates a post in the thread
 *   5. Member2 adds a comment to the post
 *   6. Member1 files a report on the thread (success)
 *   7. Member1 files a report on the post (success)
 *   8. Member1 files a report on the comment (success)
 *   9. Member1 attempts to re-report the same thread (should fail as duplicate)
 *   10. Member1 attempts to report non-existent thread/post/comment (should fail)
 *   11. Ban/soft-delete Member1, and ensure they can no longer report (should fail)
 *   12. Attempt to report as guest/no authentication (should fail)
 */
export async function test_api_discussionBoard_test_create_report_with_valid_and_invalid_targets(
  connection: api.IConnection,
) {
  // 1. Register Member1
  const member1Create = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const member1 = await api.functional.discussionBoard.members.post(connection, { body: member1Create });
  typia.assert(member1);

  // 2. Register Member2 (content owner)
  const member2Create = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const member2 = await api.functional.discussionBoard.members.post(connection, { body: member2Create });
  typia.assert(member2);

  // 3. Member2 creates a thread
  const threadCreate = {
    discussion_board_member_id: member2.id,
    discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(), // As category is not handled in scenario, mock a UUID
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.paragraph()(2),
  } satisfies IDiscussionBoardThread.ICreate;
  const thread = await api.functional.discussionBoard.threads.post(connection, { body: threadCreate });
  typia.assert(thread);

  // 4. Member2 creates a post in the thread
  const postCreate = {
    discussion_board_thread_id: thread.id,
    discussion_board_member_id: member2.id,
    body: RandomGenerator.paragraph()(2),
  } satisfies IDiscussionBoardPost.ICreate;
  const post = await api.functional.discussionBoard.posts.post(connection, { body: postCreate });
  typia.assert(post);

  // 5. Member2 adds a comment to the post
  const commentCreate = {
    discussion_board_post_id: post.id,
    parent_id: null,
    body: RandomGenerator.paragraph()(1),
  } satisfies IDiscussionBoardComment.ICreate;
  const comment = await api.functional.discussionBoard.comments.post(connection, { body: commentCreate });
  typia.assert(comment);

  // 6. Member1 reports the thread
  const reportOnThreadInput = {
    reporter_member_id: member1.id,
    thread_id: thread.id,
    post_id: null,
    comment_id: null,
    reason: "Spam or irrelevant content",
  } satisfies IDiscussionBoardReport.ICreate;
  const threadReport = await api.functional.discussionBoard.reports.post(connection, { body: reportOnThreadInput });
  typia.assert(threadReport);
  TestValidator.equals("report on thread target")(threadReport.thread_id)(thread.id);
  TestValidator.equals("reporter matches")(threadReport.reporter_member_id)(member1.id);

  // 7. Member1 reports the post
  const reportOnPostInput = {
    reporter_member_id: member1.id,
    thread_id: null,
    post_id: post.id,
    comment_id: null,
    reason: "Offensive language",
  } satisfies IDiscussionBoardReport.ICreate;
  const postReport = await api.functional.discussionBoard.reports.post(connection, { body: reportOnPostInput });
  typia.assert(postReport);
  TestValidator.equals("report on post target")(postReport.post_id)(post.id);
  TestValidator.equals("reporter matches")(postReport.reporter_member_id)(member1.id);

  // 8. Member1 reports the comment
  const reportOnCommentInput = {
    reporter_member_id: member1.id,
    thread_id: null,
    post_id: null,
    comment_id: comment.id,
    reason: "Personal attack",
  } satisfies IDiscussionBoardReport.ICreate;
  const commentReport = await api.functional.discussionBoard.reports.post(connection, { body: reportOnCommentInput });
  typia.assert(commentReport);
  TestValidator.equals("report on comment target")(commentReport.comment_id)(comment.id);
  TestValidator.equals("reporter matches")(commentReport.reporter_member_id)(member1.id);

  // 9. Duplicate report on thread (should fail)
  await TestValidator.error("duplicate thread report fails")(() =>
    api.functional.discussionBoard.reports.post(connection, { body: reportOnThreadInput })
  );

  // 10. Reporting with non-existent IDs (should fail for each type)
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("report non-existent thread")(() =>
    api.functional.discussionBoard.reports.post(connection, {
      body: {
        reporter_member_id: member1.id,
        thread_id: nonExistentUUID,
        post_id: null,
        comment_id: null,
        reason: "Attempt on non-existent thread",
      } satisfies IDiscussionBoardReport.ICreate
    })
  );
  await TestValidator.error("report non-existent post")(() =>
    api.functional.discussionBoard.reports.post(connection, {
      body: {
        reporter_member_id: member1.id,
        thread_id: null,
        post_id: nonExistentUUID,
        comment_id: null,
        reason: "Attempt on non-existent post",
      } satisfies IDiscussionBoardReport.ICreate
    })
  );
  await TestValidator.error("report non-existent comment")(() =>
    api.functional.discussionBoard.reports.post(connection, {
      body: {
        reporter_member_id: member1.id,
        thread_id: null,
        post_id: null,
        comment_id: nonExistentUUID,
        reason: "Attempt on non-existent comment",
      } satisfies IDiscussionBoardReport.ICreate
    })
  );

  // 11. Soft-delete/ban Member1 and check reporting is forbidden
  await api.functional.discussionBoard.members.eraseById(connection, { id: member1.id });
  await TestValidator.error("banned/deleted member cannot report")(() =>
    api.functional.discussionBoard.reports.post(connection, { body: reportOnThreadInput })
  );

  // 12. Reporting as guest/unauthenticated user (simulate with new connection object, no member context)
  const guestConnection = { ...connection, headers: {} };
  await TestValidator.error("guest cannot report")(() =>
    api.functional.discussionBoard.reports.post(guestConnection, { body: reportOnThreadInput })
  );
}