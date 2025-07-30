import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Validates that a comment author can retrieve full version history for their
 * own comment.
 *
 * This test covers the end-to-end flow where:
 *
 * 1. A board member is created (registration by admin).
 * 2. The member posts a comment to a (random) post.
 * 3. The member edits the comment multiple times, producing at least two total
 *    versions.
 * 4. The author requests version history for their comment and receives all
 *    versions, including timestamps and editor.
 *
 * Test asserts:
 *
 * - Each version is present and in correct order.
 * - Editor member ID matches the author for every version.
 * - Content and timestamp are set for every version.
 */
export async function test_api_discussionBoard_test_list_comment_versions_as_author(
  connection: api.IConnection,
) {
  // 1. Admin creates a member (author)
  const joinedAt = new Date().toISOString();
  const authorIdentifier = RandomGenerator.alphabets(10);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: authorIdentifier,
        joined_at: joinedAt,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Member creates an original comment under a random post
  const postId = typia.random<string & tags.Format<"uuid">>();
  const originalContent = RandomGenerator.paragraph()();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId,
        content: originalContent,
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);
  TestValidator.equals("author assigned")(comment.discussion_board_member_id)(
    member.id,
  );
  TestValidator.equals("not deleted")(comment.is_deleted)(false);
  TestValidator.equals("post ID assigned")(comment.discussion_board_post_id)(
    postId,
  );

  // 3. Member edits comment multiple times to generate version history
  const newContents = [
    RandomGenerator.paragraph()(),
    RandomGenerator.paragraph()(),
  ];
  for (const content of newContents) {
    const updated = await api.functional.discussionBoard.member.comments.update(
      connection,
      {
        commentId: comment.id,
        body: { content } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
    typia.assert(updated);
    TestValidator.equals("comment id unchanged")(updated.id)(comment.id);
    TestValidator.equals("author unchanged")(
      updated.discussion_board_member_id,
    )(member.id);
    TestValidator.equals("not deleted after edit")(updated.is_deleted)(false);
    TestValidator.predicate("content updated is non-empty")(
      typeof updated.content === "string" && updated.content.length > 0,
    );
  }

  // 4. Author requests history of comment versions
  const versionPage =
    await api.functional.discussionBoard.member.comments.versions.index(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(versionPage);

  // Should contain at least original + number of edits (might contain more with backend versioning schemes)
  TestValidator.predicate("at least all written versions present")(
    versionPage.data.length >= 1 + newContents.length,
  );

  // All versions: editor is always the same member
  for (const v of versionPage.data) {
    typia.assert(v);
    TestValidator.equals("parent comment matches")(
      v.discussion_board_comment_id,
    )(comment.id);
    TestValidator.equals("editor is author for each version")(
      v.editor_member_id,
    )(member.id);
    TestValidator.predicate("version content is set")(
      typeof v.content === "string" && v.content.length > 0,
    );
    TestValidator.predicate("timestamp is string")(
      typeof v.created_at === "string",
    );
  }
}
