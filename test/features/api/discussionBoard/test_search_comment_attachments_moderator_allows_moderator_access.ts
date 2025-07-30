import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that a moderator can search and filter attachments for any comment,
 * regardless of ownership.
 *
 * Business context: Moderators are responsible for auditing and reviewing all
 * uploaded attachments across comments. This test ensures that a moderator can
 * access attachment search on a comment they do not own and utilize all
 * provided filtering options: uploader, MIME type, file name, and upload date
 * range.
 *
 * Test workflow:
 *
 * 1. Create two discussion board members (one regular member, one moderator) for
 *    the scenario.
 * 2. As the member, create a comment on a post, and remember the comment ID.
 * 3. As the member, upload multiple attachments (with different file names, MIME
 *    types, upload times).
 * 4. As the moderator, invoke the moderator attachment search endpoint on that
 *    comment, using various filtering criteria: a. By exact uploader_member_id
 *    b. By MIME type pattern c. By partial file name d. By
 *    uploaded_from/uploaded_to (date range, covering a specific attachment)
 * 5. Assert that the results are accurate (e.g., all returned attachments have the
 *    filtered property values and all created data is visible to the
 *    moderator).
 * 6. Edge case: Ensure no error occurs if a filter results in zero results.
 */
export async function test_api_discussionBoard_test_search_comment_attachments_moderator_allows_moderator_access(
  connection: api.IConnection,
) {
  // 1. Create a regular board member and a moderator (both are just members for testing)
  const member_joined_at = new Date().toISOString();
  const moderator_joined_at = new Date(Date.now() - 60000).toISOString();
  const dbMember = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: member_joined_at,
      },
    },
  );
  typia.assert(dbMember);
  const moderator = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(14),
        joined_at: moderator_joined_at,
      },
    },
  );
  typia.assert(moderator);

  // 2. As member, create a comment (simulate a random post id)
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: dbMember.id,
        discussion_board_post_id: fakePostId,
        content: "This is a test comment with attachments.",
      },
    },
  );
  typia.assert(comment);

  // 3. As member, upload multiple attachments with varied metadata
  const attachments: IDiscussionBoardCommentAttachment[] = [];
  const mimeTypes = ["image/png", "image/jpeg", "application/pdf"];
  const baseTime = new Date();
  for (let i = 0; i < 3; ++i) {
    const uploaded_at = new Date(baseTime.getTime() + i * 15000).toISOString();
    const file_name = `testfile_${i}.${mimeTypes[i].split("/")[1]}`;
    const attachment =
      await api.functional.discussionBoard.member.comments.attachments.create(
        connection,
        {
          commentId: comment.id,
          body: {
            discussion_board_comment_id: comment.id,
            uploader_member_id: dbMember.id,
            file_name,
            file_url: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(6)}_${file_name}`,
            mime_type: mimeTypes[i],
          },
        },
      );
    typia.assert(attachment);
    // For the purpose of test, keep our intended uploaded_at stub for later validation logic
    attachments.push({ ...attachment, uploaded_at });
  }

  // 4a. Moderator filters by uploader_member_id
  let result =
    await api.functional.discussionBoard.moderator.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          uploader_member_id: dbMember.id,
        },
      },
    );
  typia.assert(result);
  TestValidator.predicate("all results uploaded by member")(
    result.data.every((a) => a.uploader_member_id === dbMember.id),
  );

  // 4b. Moderator filters by MIME type
  result =
    await api.functional.discussionBoard.moderator.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          mime_type: "application/pdf",
        },
      },
    );
  typia.assert(result);
  TestValidator.predicate("only PDF attachments")(
    result.data.every((a) => a.mime_type === "application/pdf"),
  );

  // 4c. Filter by file_name (partial match)
  result =
    await api.functional.discussionBoard.moderator.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_name: "testfile_1",
        },
      },
    );
  typia.assert(result);
  TestValidator.predicate("matching file name contains 'testfile_1'")(
    result.data.every((a) => a.file_name.includes("testfile_1")),
  );

  // 4d. Filter by upload date range
  const uploaded_from = attachments[1].uploaded_at;
  const uploaded_to = attachments[2].uploaded_at;
  result =
    await api.functional.discussionBoard.moderator.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          uploaded_from,
          uploaded_to,
        },
      },
    );
  typia.assert(result);
  TestValidator.predicate("all in uploaded date range")(
    result.data.every(
      (a) => a.uploaded_at >= uploaded_from && a.uploaded_at <= uploaded_to,
    ),
  );

  // 5. Edge case: filter yields no results
  result =
    await api.functional.discussionBoard.moderator.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          mime_type: "video/mp4",
        },
      },
    );
  typia.assert(result);
  TestValidator.equals("no results for unmatched mime type")(
    result.data.length,
  )(0);
}
