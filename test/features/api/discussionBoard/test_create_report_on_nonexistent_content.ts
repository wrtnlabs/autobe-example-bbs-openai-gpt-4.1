import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate that the system rejects reports referencing non-existent content.
 *
 * This test ensures that users cannot successfully file moderation reports
 * against posts or comments that do not exist (either fabricated ids or already
 * deleted resources). Proper error handling should occur in these cases,
 * confirming the system's ability to detect and block reports with invalid
 * references.
 *
 * Steps:
 *
 * 1. Generate a fake member id (simulating a logged-in user scenario).
 * 2. Attempt to report a non-existent post: Submit a report with a
 *    random/fabricated post id under the assumption that no such post exists.
 * 3. Validate that an error is thrown (system rejects the report due to invalid
 *    reference).
 * 4. Attempt to report a non-existent comment: Submit a report with a
 *    random/fabricated comment id under the assumption that no such comment
 *    exists.
 * 5. Validate that an error is thrown (system rejects the report due to invalid
 *    reference).
 */
export async function test_api_discussionBoard_test_create_report_on_nonexistent_content(
  connection: api.IConnection,
) {
  // 1. Generate fake member id (represents the reporting user)
  const fakeMemberId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to report a post with a non-existent post id
  const fakePostId: string = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should reject report for non-existent post")(
    async () => {
      await api.functional.discussionBoard.member.reports.create(connection, {
        body: {
          reporter_id: fakeMemberId,
          content_type: "post",
          reported_post_id: fakePostId,
          reported_comment_id: null,
          reason: "Reporting non-existent post for test.",
        } satisfies IDiscussionBoardReport.ICreate,
      });
    },
  );

  // 4. Attempt to report a comment with a non-existent comment id
  const fakeCommentId: string = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should reject report for non-existent comment")(
    async () => {
      await api.functional.discussionBoard.member.reports.create(connection, {
        body: {
          reporter_id: fakeMemberId,
          content_type: "comment",
          reported_post_id: null,
          reported_comment_id: fakeCommentId,
          reason: "Reporting non-existent comment for test.",
        } satisfies IDiscussionBoardReport.ICreate,
      });
    },
  );
}
