import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test the search API for comment attachments with pagination and sorting.
 *
 * Business goal: Validate that a board comment's attachment search endpoint
 * correctly honors pagination limits, default page size, and ordering (desc by
 * upload timestamp).
 *
 * Steps:
 *
 * 1. Create a comment as a member.
 * 2. Upload more attachments than a typical default page size (default limit is
 *    assumed 100).
 * 3. Search for attachments without limit param (should return default first
 *    page/size).
 * 4. Search with explicit smaller limit (e.g., 10), and verify returned data size
 *    and order.
 * 5. Request subsequent pages to verify pagination (page 2, page 11 as last page,
 *    page 12 as beyond bounds).
 * 6. On each step, verify both returned data and pagination meta.
 */
export async function test_api_discussionBoard_test_search_comment_attachments_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Create a comment
  const member_id: string = typia.random<string & tags.Format<"uuid">>();
  const post_id: string = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member_id,
        discussion_board_post_id: post_id,
        content: RandomGenerator.paragraph()(),
      },
    },
  );
  typia.assert(comment);

  // 2. Upload more than the default page size (e.g. 105 attachments)
  const attachment_count = 105;
  const files = ArrayUtil.repeat(attachment_count)((i) => ({
    discussion_board_comment_id: comment.id,
    uploader_member_id: member_id,
    file_name: `file_${i + 1}.txt`,
    file_url: `https://cdn.example.com/file_${i + 1}`,
    mime_type: "text/plain",
  }));
  let uploaded_files: IDiscussionBoardCommentAttachment[] = [];
  for (const file of files) {
    const att =
      await api.functional.discussionBoard.member.comments.attachments.create(
        connection,
        {
          commentId: comment.id,
          body: file,
        },
      );
    uploaded_files.push(att);
  }
  // For expectations, sort by uploaded_at desc
  uploaded_files = [...uploaded_files].sort((a, b) =>
    b.uploaded_at.localeCompare(a.uploaded_at),
  );

  // 3. Search without limit (should use default limit of 100)
  const first_page =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
        },
      },
    );
  typia.assert(first_page);
  TestValidator.equals("default page size")(first_page.data.length)(100);
  TestValidator.equals("page size meta")(first_page.pagination.limit)(100);
  TestValidator.equals("total records")(first_page.pagination.records)(
    attachment_count,
  );
  TestValidator.equals("total pages")(first_page.pagination.pages)(2);
  // Confirm returned objects are the most recently uploaded
  for (let i = 0; i < 100; ++i)
    TestValidator.equals(`attachment order default [${i}]`)(
      first_page.data[i].id,
    )(uploaded_files[i].id);

  // 4. Search with limit = 10
  const limited =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          limit: 10,
        },
      },
    );
  typia.assert(limited);
  TestValidator.equals("limit 10 result count")(limited.data.length)(10);
  TestValidator.equals("limit meta")(limited.pagination.limit)(10);
  for (let i = 0; i < 10; ++i)
    TestValidator.equals(`attachment order limit [${i}]`)(limited.data[i].id)(
      uploaded_files[i].id,
    );

  // 5. Page 2 of limit 10
  const page_2 =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          limit: 10,
          page: 2,
        },
      },
    );
  typia.assert(page_2);
  TestValidator.equals("page 2 count")(page_2.data.length)(10);
  for (let i = 0; i < 10; ++i)
    TestValidator.equals(`attachment order page2 [${i}]`)(page_2.data[i].id)(
      uploaded_files[i + 10].id,
    );

  // 6. Last valid page: page 11 of limit 10 (only 5 files)
  const last_page =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          limit: 10,
          page: 11,
        },
      },
    );
  typia.assert(last_page);
  TestValidator.equals("last page is partial")(last_page.data.length)(5);
  for (let i = 0; i < 5; ++i)
    TestValidator.equals(`attachment order last page [${i}]`)(
      last_page.data[i].id,
    )(uploaded_files[100 + i].id);

  // 7. Excess page: page 12 (should return empty array)
  const beyond =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          limit: 10,
          page: 12,
        },
      },
    );
  typia.assert(beyond);
  TestValidator.equals("excess page empty")(beyond.data.length)(0);
}
