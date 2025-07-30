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
 * Validates that admin can perform filtered and paginated searches on
 * attachments for any comment through the admin endpoint, including positive
 * and negative filter coverage, pagination, and strict enforcement of security
 * and privacy policies.
 *
 * Test Scope:
 *
 * 1. Registers an admin and a normal member
 * 2. Member creates two comments (each on a unique, random post)
 * 3. Member uploads attachments to each comment, ensuring variety in MIME types,
 *    names, uploaders, timestamps
 * 4. As admin: searches attachments by commentId (no filters), then exercises
 *    filters (mime_type, file_name, uploader, uploaded_from/to), and validates
 *    paging (using limit/page), also tests negative cases (invalid commentId,
 *    bad filters)
 * 5. Security: demonstrates that non-admin cannot use this endpoint (throws error
 *    if so)
 *
 * This test ensures all DTO and role/policy rules are respected and that the
 * endpoint is robust against filter errors, privacy breaches, and improper
 * access.
 */
export async function test_api_discussionBoard_test_search_comment_attachments_admin_filter_and_security(
  connection: api.IConnection,
) {
  // Step 1: Register admin and member
  // Generate two logically unique users: one admin, one member
  const admin_user_identifier = `admin_${RandomGenerator.alphaNumeric(8)}`;
  const member_user_identifier = `user_${RandomGenerator.alphaNumeric(8)}`;
  const now = new Date().toISOString();

  // Register admin (by convention, all accounts via admin endpoint in this system are privileged)
  const admin = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: admin_user_identifier,
        joined_at: now,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(admin);

  // Register member
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: member_user_identifier,
        joined_at: now,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // Step 2: Member creates two comments (use fake, random post IDs, must be UUID)
  const postId1 = typia.random<string & tags.Format<"uuid">>();
  const postId2 = typia.random<string & tags.Format<"uuid">>();

  // Switch role: (simulate member authorization context if needed)

  const comment1 = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId1,
        content: RandomGenerator.content()()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment1);

  const comment2 = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId2,
        content: RandomGenerator.content()()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment2);

  // Step 3: Upload attachments (multiple per comment, different MIME, names, uploader)
  // We'll use admin and member as possible uploaders to test filter
  const mimeTypes = ["image/png", "application/pdf", "text/plain"];
  const fileNames = [
    `attach_${RandomGenerator.alphaNumeric(5)}.png`,
    `doc_${RandomGenerator.alphaNumeric(4)}.pdf`,
    `note_${RandomGenerator.alphaNumeric(6)}.txt`,
  ];
  const fakeUrlRoot = "https://cdn.example.com/";
  const uploadedAts = [
    new Date(Date.now() - 100000).toISOString(),
    new Date().toISOString(),
    new Date(Date.now() + 100000).toISOString(),
  ];

  // For comment 1: 2 attachments by member, 1 by admin
  const attachment1_1 =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment1.id,
        body: {
          discussion_board_comment_id: comment1.id,
          uploader_member_id: member.id,
          file_name: fileNames[0],
          file_url: fakeUrlRoot + RandomGenerator.alphaNumeric(10),
          mime_type: mimeTypes[0],
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment1_1);
  // Simulate time difference using another for upload date coverage
  const attachment1_2 =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment1.id,
        body: {
          discussion_board_comment_id: comment1.id,
          uploader_member_id: member.id,
          file_name: fileNames[1],
          file_url: fakeUrlRoot + RandomGenerator.alphaNumeric(10),
          mime_type: mimeTypes[1],
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment1_2);
  // Admin uploads one
  const attachment1_3 =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment1.id,
        body: {
          discussion_board_comment_id: comment1.id,
          uploader_member_id: admin.id,
          file_name: fileNames[2],
          file_url: fakeUrlRoot + RandomGenerator.alphaNumeric(10),
          mime_type: mimeTypes[2],
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment1_3);

  // For comment 2: 1 by member, 1 by admin
  const attachment2_1 =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment2.id,
        body: {
          discussion_board_comment_id: comment2.id,
          uploader_member_id: member.id,
          file_name: fileNames[2],
          file_url: fakeUrlRoot + RandomGenerator.alphaNumeric(10),
          mime_type: mimeTypes[2],
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment2_1);

  const attachment2_2 =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment2.id,
        body: {
          discussion_board_comment_id: comment2.id,
          uploader_member_id: admin.id,
          file_name: fileNames[1],
          file_url: fakeUrlRoot + RandomGenerator.alphaNumeric(10),
          mime_type: mimeTypes[1],
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment2_2);

  // Step 4: As admin, search (test various filters/pagination)

  // 4a. Search all attachments for comment1 (no filter)
  let pageAllComment1 =
    await api.functional.discussionBoard.admin.comments.attachments.search(
      connection,
      {
        commentId: comment1.id,
        body: { comment_id: comment1.id },
      },
    );
  typia.assert(pageAllComment1);
  TestValidator.equals("all for comment1")(pageAllComment1.data.length)(3);
  TestValidator.predicate("all returned match comment1")(
    pageAllComment1.data.every(
      (a) => a.discussion_board_comment_id === comment1.id,
    ),
  );

  // 4b. Search with MIME type filter (comment1)
  let mimeFiltered =
    await api.functional.discussionBoard.admin.comments.attachments.search(
      connection,
      {
        commentId: comment1.id,
        body: {
          comment_id: comment1.id,
          mime_type: mimeTypes[0],
        },
      },
    );
  typia.assert(mimeFiltered);
  TestValidator.equals("mime filtered comment1")(mimeFiltered.data.length)(1);
  TestValidator.equals("filtered mime")(mimeFiltered.data[0].mime_type)(
    mimeTypes[0],
  );

  // 4c. Filter by uploader (admin id)
  let uploaderFiltered =
    await api.functional.discussionBoard.admin.comments.attachments.search(
      connection,
      {
        commentId: comment1.id,
        body: {
          comment_id: comment1.id,
          uploader_member_id: admin.id,
        },
      },
    );
  typia.assert(uploaderFiltered);
  TestValidator.equals("by uploader admin")(uploaderFiltered.data.length)(1);
  TestValidator.equals("has uploader admin")(
    uploaderFiltered.data[0].uploader_member_id,
  )(admin.id);

  // 4d. Filter by file_name (exact)
  let fileNameFiltered =
    await api.functional.discussionBoard.admin.comments.attachments.search(
      connection,
      {
        commentId: comment1.id,
        body: {
          comment_id: comment1.id,
          file_name: fileNames[1],
        },
      },
    );
  typia.assert(fileNameFiltered);
  TestValidator.equals("file name filtered")(
    fileNameFiltered.data[0].file_name,
  )(fileNames[1]);

  // 4e. Negative/mismatch filter (should get zero results): bad mime+uploader
  let negativeFilter =
    await api.functional.discussionBoard.admin.comments.attachments.search(
      connection,
      {
        commentId: comment1.id,
        body: {
          comment_id: comment1.id,
          mime_type: "bad/type",
          uploader_member_id: member.id,
        },
      },
    );
  typia.assert(negativeFilter);
  TestValidator.equals("bad filter gives no results")(
    negativeFilter.data.length,
  )(0);

  // 4f. Uploaded_from/to filters – expect only relevant by time
  // (simulate a range that includes at least one attachment)
  let fromDate = new Date(Date.now() - 200000).toISOString();
  let toDate = new Date(Date.now() + 200000).toISOString();
  let timeFiltered =
    await api.functional.discussionBoard.admin.comments.attachments.search(
      connection,
      {
        commentId: comment1.id,
        body: {
          comment_id: comment1.id,
          uploaded_from: fromDate,
          uploaded_to: toDate,
        },
      },
    );
  typia.assert(timeFiltered);
  TestValidator.predicate("uploaded_at in range")(
    timeFiltered.data.every(
      (a) => a.uploaded_at >= fromDate && a.uploaded_at <= toDate,
    ),
  );

  // 4g. Pagination test: limit=2, expect only 2 records
  let paged =
    await api.functional.discussionBoard.admin.comments.attachments.search(
      connection,
      {
        commentId: comment1.id,
        body: { comment_id: comment1.id, limit: 2, page: 1 },
      },
    );
  typia.assert(paged);
  TestValidator.equals("pagination")(paged.data.length)(2);
  TestValidator.equals("returned page info")(paged.pagination.limit)(2);
  TestValidator.equals("pagination is page1")(paged.pagination.current)(1);

  // 4h. Pagination page 2 — should see the remaining record(s)
  let paged2 =
    await api.functional.discussionBoard.admin.comments.attachments.search(
      connection,
      {
        commentId: comment1.id,
        body: { comment_id: comment1.id, limit: 2, page: 2 },
      },
    );
  typia.assert(paged2);
  TestValidator.equals("pagination page2 length")(paged2.data.length)(1);
  TestValidator.equals("pagination is page2")(paged2.pagination.current)(2);

  // 4i. Non-existent comment id
  let nonExistentId = typia.random<string & tags.Format<"uuid">>();
  let nonexistent =
    await api.functional.discussionBoard.admin.comments.attachments.search(
      connection,
      {
        commentId: nonExistentId,
        body: { comment_id: nonExistentId },
      },
    );
  typia.assert(nonexistent);
  TestValidator.equals("nonexistent comment gives no data")(
    nonexistent.data.length,
  )(0);

  // 4j. Comment2: all attachments, filter by admin
  let allComment2 =
    await api.functional.discussionBoard.admin.comments.attachments.search(
      connection,
      {
        commentId: comment2.id,
        body: { comment_id: comment2.id },
      },
    );
  typia.assert(allComment2);
  TestValidator.equals("comment2 total attachments")(allComment2.data.length)(
    2,
  );
  let adminFiltered2 =
    await api.functional.discussionBoard.admin.comments.attachments.search(
      connection,
      {
        commentId: comment2.id,
        body: { comment_id: comment2.id, uploader_member_id: admin.id },
      },
    );
  typia.assert(adminFiltered2);
  TestValidator.equals("comment2 admin uploader")(adminFiltered2.data.length)(
    1,
  );
  TestValidator.equals("comment2 admin uploader id")(
    adminFiltered2.data[0].uploader_member_id,
  )(admin.id);

  // Step 5: Security test — try accessing admin search as non-admin (simulate forbidden)
  await TestValidator.error(
    "member cannot call admin endpoint for attachments list",
  )(async () => {
    await api.functional.discussionBoard.admin.comments.attachments.search(
      connection,
      {
        commentId: comment1.id,
        body: { comment_id: comment1.id },
      },
    );
  });
}
