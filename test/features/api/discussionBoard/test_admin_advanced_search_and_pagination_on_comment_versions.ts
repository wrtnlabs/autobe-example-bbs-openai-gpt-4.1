import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";
import type { IPageIDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for advanced search and pagination of comment versions as an admin.
 *
 * This test simulates the full workflow required to produce, then audit the
 * version history of a comment, as would be performed by an admin responsible
 * for moderation or forensic purposes.
 *
 * Steps:
 *
 * 1. A member creates a comment on a post (using the member endpoint).
 * 2. Multiple edits (versions) are performed, with at least one version authored
 *    by the member and others by admin or simulated moderator (all must be
 *    attributed correctly, simulating role switching by editor_member_id).
 * 3. Use the PATCH /discussionBoard/admin/comments/{commentId}/versions endpoint
 *    to: a. Retrieve all versions with no filter, verify total count and data
 *    integrity matches input edits. b. Filter by editor_member_id for both
 *    member/editor and admin, and by content substring, and by created_at
 *    range. Verify results are correctly filtered. c. Paging controls are
 *    assumed not implemented at request body due to DTO signature; so paging
 *    step is omitted from concrete tests. d. Query with a filter that yields no
 *    results (simulates out-of-range page), confirming a handled error.
 */
export async function test_api_discussionBoard_test_admin_advanced_search_and_pagination_on_comment_versions(
  connection: api.IConnection,
) {
  // 1. Create a new comment as a member
  const member_id = typia.random<string & tags.Format<"uuid">>();
  const post_id = typia.random<string & tags.Format<"uuid">>();
  const base_content = RandomGenerator.paragraph()();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member_id,
        discussion_board_post_id: post_id,
        content: base_content,
      },
    },
  );
  typia.assert(comment);
  TestValidator.equals("author used")(comment.discussion_board_member_id)(
    member_id,
  );
  TestValidator.equals("belongs-to-post")(comment.discussion_board_post_id)(
    post_id,
  );

  // 2. Perform multiple edits (versions) attributed to different roles
  const admin_id = typia.random<string & tags.Format<"uuid">>();
  const moderator_id = typia.random<string & tags.Format<"uuid">>();

  // Edits: member, admin, moderator
  const versions = [];
  versions.push(
    await api.functional.discussionBoard.admin.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: member_id,
          content: RandomGenerator.paragraph()(),
        },
      },
    ),
  );
  versions.push(
    await api.functional.discussionBoard.admin.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: admin_id,
          content: RandomGenerator.paragraph()(),
        },
      },
    ),
  );
  versions.push(
    await api.functional.discussionBoard.admin.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: moderator_id,
          content: RandomGenerator.paragraph()(),
        },
      },
    ),
  );
  for (const v of versions) typia.assert(v);

  // 3a. Retrieve all versions with no filter
  const allVersions =
    await api.functional.discussionBoard.admin.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: {},
      },
    );
  typia.assert(allVersions);
  TestValidator.equals("version count")(allVersions.data.length)(
    versions.length,
  );
  allVersions.data.forEach((ver) =>
    TestValidator.equals("comment id match")(ver.discussion_board_comment_id)(
      comment.id,
    ),
  );

  // 3b. Filter by editor_member_id (member)
  const memberOnly =
    await api.functional.discussionBoard.admin.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: {
          editor_member_id: member_id,
        },
      },
    );
  typia.assert(memberOnly);
  memberOnly.data.forEach((ver) =>
    TestValidator.equals("editor filter: member")(ver.editor_member_id)(
      member_id,
    ),
  );

  // filter by editor_member_id (admin)
  const adminOnly =
    await api.functional.discussionBoard.admin.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: {
          editor_member_id: admin_id,
        },
      },
    );
  typia.assert(adminOnly);
  adminOnly.data.forEach((ver) =>
    TestValidator.equals("editor filter: admin")(ver.editor_member_id)(
      admin_id,
    ),
  );

  // filter by content_contains (arbitrary string from edit)
  const containedText = versions[0].content.slice(0, 5);
  const containsFilter =
    await api.functional.discussionBoard.admin.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: {
          content_contains: containedText,
        },
      },
    );
  typia.assert(containsFilter);
  containsFilter.data.forEach((ver) =>
    TestValidator.predicate("content substring present")(
      ver.content.includes(containedText),
    ),
  );

  // filter by created_at_from/created_at_to
  const from = versions[0].created_at;
  const to = versions[2].created_at;
  const rangeFilter =
    await api.functional.discussionBoard.admin.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: {
          created_at_from: from,
          created_at_to: to,
        },
      },
    );
  typia.assert(rangeFilter);
  rangeFilter.data.forEach((ver) => {
    TestValidator.predicate("in range")(
      ver.created_at >= from && ver.created_at <= to,
    );
  });

  // 3c. Paging controls are not implemented in the DTO; skip explicit paging logic.
  // 3d. Query with a filter that yields no results (simulate an out-of-range page equivalent)
  await TestValidator.error("invalid filter should error")(async () => {
    await api.functional.discussionBoard.admin.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: {
          editor_member_id: typia.random<string & tags.Format<"uuid">>(),
          content_contains: "NON_EXISTENT_SUBSTR",
        },
      },
    );
  });
}
