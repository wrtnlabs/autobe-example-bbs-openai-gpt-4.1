import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";
import type { IPageIDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced search and pagination of a comment's version history by a
 * moderator.
 *
 * Ensures that:
 *
 * 1. A member creates a comment under a post.
 * 2. Multiple versions are created for that comment: by both the member (original
 *    author) and moderator (as editor).
 * 3. Moderator executes advanced search:
 *
 *    - Filter by editor_member_id (should only return moderator's edits)
 *    - Filter by date/time window (created_at_from/to)
 *    - Filter by content substring (content_contains)
 *    - Test presence/structure of pagination (cannot set limits explicitly as per
 *         DTO, but verifies structure)
 * 4. Validates that results returned match search criteria (editor/content/date).
 * 5. Ensures error is returned for invalid commentId, validated via
 *    TestValidator.error().
 */
export async function test_api_discussionBoard_test_moderator_advanced_search_on_comment_versions(
  connection: api.IConnection,
) {
  // 1. MEMBER creates a comment for a post
  const memberId: string = typia.random<string & tags.Format<"uuid">>();
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content: "Initial member comment content.",
      },
    },
  );
  typia.assert(comment);

  // 2. First version by member (simulate edit by member)
  const memberEditContent = "Member edit 1 content.";
  const memberEdit =
    await api.functional.discussionBoard.moderator.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: memberId,
          content: memberEditContent,
        },
      },
    );
  typia.assert(memberEdit);

  // 3. Moderator creates two edit versions
  const moderatorId: string = typia.random<string & tags.Format<"uuid">>();
  const modEditContent1 = "Moderator edit version 1";
  const modEdit1 =
    await api.functional.discussionBoard.moderator.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: moderatorId,
          content: modEditContent1,
        },
      },
    );
  typia.assert(modEdit1);

  await new Promise((res) => setTimeout(res, 50));
  const modEditContent2 = "Moderator edit version 2";
  const modEdit2 =
    await api.functional.discussionBoard.moderator.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: moderatorId,
          content: modEditContent2,
        },
      },
    );
  typia.assert(modEdit2);

  // 4. Search by editor_member_id (moderator)
  const searchByEditor =
    await api.functional.discussionBoard.moderator.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: {
          editor_member_id: moderatorId,
        },
      },
    );
  typia.assert(searchByEditor);
  const expectedModIds = [modEdit1.id, modEdit2.id];
  TestValidator.equals("only moderator version IDs returned")(
    new Set(searchByEditor.data.map((v) => v.id)),
  )(new Set(expectedModIds));

  // 5. Search by date window (from/to: only moderator's edits)
  const from = modEdit1.created_at;
  const to = modEdit2.created_at;
  const searchByTime =
    await api.functional.discussionBoard.moderator.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: {
          created_at_from: from,
          created_at_to: to,
        },
      },
    );
  typia.assert(searchByTime);
  TestValidator.predicate("versions in correct date range")(
    searchByTime.data.every(
      (ver) => ver.created_at >= from && ver.created_at <= to,
    ),
  );

  // 6. Search by content substring
  const substring = "edit version 1";
  const searchByContent =
    await api.functional.discussionBoard.moderator.comments.versions.search(
      connection,
      {
        commentId: comment.id,
        body: {
          content_contains: substring,
        },
      },
    );
  typia.assert(searchByContent);
  TestValidator.predicate("content substring present")(
    searchByContent.data.every((ver) => ver.content.includes(substring)),
  );

  // 7. Pagination response structure (cannot directly set page/limit via DTO, so just verify type/structure)
  TestValidator.equals("pagination type present")(
    typeof searchByEditor.pagination.current,
  )("number");

  // 8. Error: invalid commentId for search returns error
  await TestValidator.error("invalid commentId triggers error")(async () => {
    await api.functional.discussionBoard.moderator.comments.versions.search(
      connection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
        body: {},
      },
    );
  });
}
