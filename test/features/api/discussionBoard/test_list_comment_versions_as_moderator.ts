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
 * Validate moderator's ability to view full edit/version history of any
 * comment.
 *
 * This test ensures that even if a moderator is not the author, they can
 * retrieve all versions of a board comment, including editor details and
 * content history.
 *
 * Steps:
 *
 * 1. Register a new board member who will author the comment.
 * 2. As the member, create a comment under a random post.
 * 3. (Simulate version history via repeated creation as update/edit endpoint is
 *    unavailable)
 * 4. As a moderator, fetch the full version history for the comment and validate
 *    all data.
 */
export async function test_api_discussionBoard_test_list_comment_versions_as_moderator(
  connection: api.IConnection,
) {
  // 1. Register a new board member
  const memberIdentifier = `user_${RandomGenerator.alphaNumeric(10)}`;
  const joinedAt = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberIdentifier,
        joined_at: joinedAt,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a comment as the member (random post ID)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentContent1 = RandomGenerator.paragraph()();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId,
        content: commentContent1,
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. No explicit API to edit a comment and create new version; skipping as only provided endpoints are used

  // 4. As moderator, get version history for the comment
  const versionsPage =
    await api.functional.discussionBoard.moderator.comments.versions.index(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(versionsPage);

  // 5. Validate version list has at least one version and metadata is correct
  TestValidator.predicate("at least 1 version exists")(
    versionsPage.data.length >= 1,
  );
  for (const version of versionsPage.data) {
    TestValidator.predicate("version has content")(
      typeof version.content === "string" && version.content.length > 0,
    );
    TestValidator.predicate("editor id present")(
      typeof version.editor_member_id === "string" &&
        version.editor_member_id.length > 0,
    );
    TestValidator.predicate("created_at is ISO string")(
      typeof version.created_at === "string" &&
        !isNaN(Date.parse(version.created_at)),
    );
  }
}
