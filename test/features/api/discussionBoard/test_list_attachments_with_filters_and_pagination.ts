import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for listing attachments from the discussion board, covering filtering, pagination, and role-based visibility.
 *
 * This test ensures that the attachments listing API properly supports a wide range of filtering options,
 * returns correct results for both normal and edge cases, respects pagination, and enforces proper role/permission based visibility.
 *
 * Scenario:
 * 1. Register two test members (simulating uploader identities).
 * 2. Each member uploads multiple attachments with diverse file names, content types, and timestamps.
 * 3. Soft-delete some of the attachments to test deletion filters and visibility (simulated in-memory since no delete API exposed).
 * 4. As each member:
 *    a. List attachments filtered by their own uploader id; expect to see only their non-deleted attachments.
 *    b. Filter by file_name and content_type; expect only matching attachments in the response.
 *    c. Filter by created_at (date range); expect proper time window results.
 *    d. Query with deleted:true/false to check soft-deleted visibility.
 *    e. Validate pagination parameters (limit, page, and boundary conditions)—normalize and validate expected number and identity of items.
 * 5. Edge cases: filter with no matches (expect empty result).
 * 6. If role elevation supported (not in provided SDK), skip true admin/moderator checks and only verify per-member isolation (members see their own data).
 *
 * Key checks:
 * - Attachments filtered as expected for file_name, content_type, uploader, and date windows
 * - Pagination limits enforced, correct offsetting/page slicing
 * - Soft deletes respected (deleted attachments not shown by default; shown if requested)
 * - Attachments not visible to other members (enforced via uploader_id filter only, since authentication/roles not modeled in API)
 * - No-matches queries return empty data array
 */
export async function test_api_discussionBoard_test_list_attachments_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register two discussion board members
  const member1Input = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const member1 = await api.functional.discussionBoard.members.post(connection, { body: member1Input });
  typia.assert(member1);

  const member2Input = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const member2 = await api.functional.discussionBoard.members.post(connection, { body: member2Input });
  typia.assert(member2);

  // 2. Upload 3 attachments for each member, varying file name, content type, and timestamp
  const now = new Date();
  const earlier = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day before
  const allAttachments: IDiscussionBoardAttachment[] = [];
  for (const [idx, uploader] of [member1, member2].entries()) {
    for (let i = 0; i < 3; ++i) {
      const dt = new Date(earlier.getTime() + i * 1000 * 60 * 60 * 6); // stagger by 6 hours
      const attInput = {
        discussion_board_post_id: null,
        discussion_board_comment_id: null,
        file_name: `testfile_${idx}_${i}.txt`,
        file_uri: `/files/discussion/${RandomGenerator.alphaNumeric(16)}.txt`,
        content_type: i % 2 === 0 ? "text/plain" : "application/pdf",
        content_hash: RandomGenerator.alphaNumeric(40),
      } satisfies IDiscussionBoardAttachment.ICreate;
      const att = await api.functional.discussionBoard.attachments.post(connection, { body: { ...attInput } });
      // Patch memory model with uploader id and simulated timestamp
      (att as any).discussion_board_member_id = uploader.id;
      (att as any).created_at = dt.toISOString();
      allAttachments.push(att);
    }
  }
  typia.assert(allAttachments);

  // 3. Simulate soft deletion (as there's no delete API): mark first of each member as deleted
  for (const att of [allAttachments[0], allAttachments[3]]) {
    (att as any).deleted_at = new Date(now.getTime() - 1000 * 60 * 30).toISOString();
  }
  // Find a mid-point date for filtering
  const midTime = allAttachments[2].created_at;

  // 4a. As member1: list attachments filtered by their own uploader id, only non-deleted
  const member1Visible = allAttachments.filter(
    a => a.discussion_board_member_id === member1.id && !(a as any).deleted_at,
  );
  const res1 = await api.functional.discussionBoard.attachments.patch(connection, {
    body: {
      discussion_board_member_id: member1.id,
      deleted: false,
    },
  });
  typia.assert(res1);
  TestValidator.equals("member1 sees only their non-deleted")(res1.data.map(d => d.id).sort())(member1Visible.map(d => d.id).sort());

  // 4b. Filter by file_name for member1
  const matchFile = allAttachments[1];
  const res2 = await api.functional.discussionBoard.attachments.patch(connection, {
    body: {
      discussion_board_member_id: member1.id,
      file_name: matchFile.file_name,
      deleted: false,
    },
  });
  typia.assert(res2);
  TestValidator.equals("filter by file_name")(res2.data.length)(1);
  TestValidator.equals("file_name match")(res2.data[0].file_name)(matchFile.file_name);

  // 4c. Filter by content_type application/pdf (global, across all members)
  const pdfFilter = await api.functional.discussionBoard.attachments.patch(connection, {
    body: { content_type: "application/pdf", deleted: false },
  });
  typia.assert(pdfFilter);
  for (const d of pdfFilter.data) TestValidator.equals("content_type")(d.content_type)("application/pdf");

  // 4d. Filter by created_at date window
  const res3 = await api.functional.discussionBoard.attachments.patch(connection, {
    body: {
      created_at_from: earlier.toISOString(),
      created_at_to: midTime,
      deleted: false,
    },
  });
  typia.assert(res3);
  for (const d of res3.data) {
    TestValidator.predicate("within date window")(
      d.created_at >= earlier.toISOString() && d.created_at <= midTime,
    );
  }

  // 4e. Query with deleted:true (should return only soft-deleted)
  const res4 = await api.functional.discussionBoard.attachments.patch(connection, {
    body: { deleted: true },
  });
  typia.assert(res4);
  TestValidator.equals("only deleted attachments returned")(
    res4.data.map(d => d.id).sort(),
  )([allAttachments[0].id, allAttachments[3].id].sort());

  // 4f. Pagination: page 1 (limit 2), then page 2
  const resPage1 = await api.functional.discussionBoard.attachments.patch(connection, {
    body: { limit: 2, page: 1, deleted: false },
  });
  typia.assert(resPage1);
  TestValidator.equals("page 1 size")(resPage1.data.length)(2);
  const resPage2 = await api.functional.discussionBoard.attachments.patch(connection, {
    body: { limit: 2, page: 2, deleted: false },
  });
  typia.assert(resPage2);
  TestValidator.equals("page 2 size")(resPage2.data.length)(2);
  // Check for disjointness (no overlap)
  for (const d1 of resPage1.data)
    for (const d2 of resPage2.data)
      TestValidator.notEquals("no overlap between pages")(d1.id)(d2.id);

  // 5. Edge case: filter with no matching file_name
  const resNone = await api.functional.discussionBoard.attachments.patch(connection, {
    body: { file_name: "no_such_file", deleted: false },
  });
  typia.assert(resNone);
  TestValidator.equals("no matches empty")(resNone.data.length)(0);
}