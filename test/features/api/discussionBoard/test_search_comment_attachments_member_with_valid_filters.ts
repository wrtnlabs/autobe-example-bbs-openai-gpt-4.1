import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test a member's ability to filter attachments on their own comment using file
 * name, uploader, and MIME type filters. Also, verify proper pagination.
 *
 * Business context: Verifies that after uploading multiple attachments to their
 * own comment, a member can retrieve subsets using various filters and
 * pagination. Ensures search works for partial & exact file_name match,
 * mime_type, uploader ID, and composite filter. Pagination and empty search
 * behaviors are also validated.
 *
 * Steps:
 *
 * 1. Create a new comment as a member
 * 2. Upload several attachments to that comment with different file names and MIME
 *    types
 * 3. Filter/search: file name (partial/exact), MIME type, uploader_member_id,
 *    composite filters
 * 4. Pagination behavior for result sets
 * 5. Non-matching and "no filter" result correctness
 */
export async function test_api_discussionBoard_test_search_comment_attachments_member_with_valid_filters(
  connection: api.IConnection,
) {
  // 1. Create a new comment as a member
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content:
          "Comment for attachment filter test - " +
          RandomGenerator.content()()(),
      },
    },
  );
  typia.assert(comment);

  // 2. Upload several attachments to this comment
  const files = [
    {
      file_name: "fileA.jpg",
      mime_type: "image/jpeg",
      file_url: "https://cdn.example.com/fileA.jpg",
    },
    {
      file_name: "fileB.png",
      mime_type: "image/png",
      file_url: "https://cdn.example.com/fileB.png",
    },
    {
      file_name: "testC.docx",
      mime_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      file_url: "https://cdn.example.com/testC.docx",
    },
    {
      file_name: "reportD.pdf",
      mime_type: "application/pdf",
      file_url: "https://cdn.example.com/reportD.pdf",
    },
  ];
  const attachments: IDiscussionBoardCommentAttachment[] = [];
  for (const f of files) {
    const att =
      await api.functional.discussionBoard.member.comments.attachments.create(
        connection,
        {
          commentId: comment.id,
          body: {
            discussion_board_comment_id: comment.id,
            uploader_member_id: memberId,
            file_name: f.file_name,
            file_url: f.file_url,
            mime_type: f.mime_type,
          },
        },
      );
    typia.assert(att);
    attachments.push(att);
  }

  // 3. Filter: file_name partial match ("file")
  let result =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: { comment_id: comment.id, file_name: "file" },
      },
    );
  typia.assert(result);
  TestValidator.predicate("file_name partial match count")(
    result.data.length === 2,
  );
  TestValidator.equals("partial match items")(
    result.data.map((a) => a.file_name).sort(),
  )(["fileA.jpg", "fileB.png"]);

  // 4. Filter: file_name exact match ("testC.docx")
  result =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: { comment_id: comment.id, file_name: "testC.docx" },
      },
    );
  typia.assert(result);
  TestValidator.predicate("file_name exact match count")(
    result.data.length === 1,
  );
  TestValidator.equals("file_name")(result.data[0].file_name)("testC.docx");

  // 5. Filter: by mime_type ("application/pdf")
  result =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: { comment_id: comment.id, mime_type: "application/pdf" },
      },
    );
  typia.assert(result);
  TestValidator.predicate("mime_type match count")(result.data.length === 1);
  TestValidator.equals("mime_type")(result.data[0].mime_type)(
    "application/pdf",
  );

  // 6. Filter: by uploader_member_id
  result =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: { comment_id: comment.id, uploader_member_id: memberId },
      },
    );
  typia.assert(result);
  TestValidator.predicate("uploader_member_id match count")(
    result.data.length === attachments.length,
  );

  // 7. Composite filter: file_name + mime_type
  result =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_name: "fileA.jpg",
          mime_type: "image/jpeg",
        },
      },
    );
  typia.assert(result);
  TestValidator.predicate("composite filter count")(result.data.length === 1);
  TestValidator.equals("file_name")(result.data[0].file_name)("fileA.jpg");
  TestValidator.equals("mime_type")(result.data[0].mime_type)("image/jpeg");

  // 8. Pagination (limit=2, page=1)
  result =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: { comment_id: comment.id, page: 1, limit: 2 },
      },
    );
  typia.assert(result);
  TestValidator.equals("pagination length")(result.data.length)(2);
  TestValidator.equals("pagination page")(result.pagination.current)(1);
  TestValidator.equals("pagination limit")(result.pagination.limit)(2);

  // 9. Pagination: page 2
  result =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: { comment_id: comment.id, page: 2, limit: 2 },
      },
    );
  typia.assert(result);
  TestValidator.equals("pagination page 2")(result.pagination.current)(2);
  TestValidator.equals("pagination length")(result.data.length)(2);

  // 10. Non-matching query (file_name: "notfound.txt")
  result =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: { comment_id: comment.id, file_name: "notfound.txt" },
      },
    );
  typia.assert(result);
  TestValidator.equals("non-matching")(result.data.length)(0);

  // 11. No filter (all attachments, paginated)
  result =
    await api.functional.discussionBoard.member.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: { comment_id: comment.id, limit: 10 },
      },
    );
  typia.assert(result);
  TestValidator.equals("all items")(result.data.length)(attachments.length);
  TestValidator.equals("id set")(result.data.map((a) => a.id).sort())(
    attachments.map((a) => a.id).sort(),
  );
}
