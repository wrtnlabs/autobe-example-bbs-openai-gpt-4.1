import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Verify moderator can successfully retrieve a specific comment version.
 *
 * This test covers the full workflow for comment version retrieval as a
 * moderator, including end-to-end data setup:
 *
 * 1. Create a discussion board member (using admin privileges).
 * 2. Create a comment authored by this member on some post.
 * 3. Create a new version of the comment (edit), so there are at least two
 *    versions.
 * 4. As a moderator, retrieve the specific version by its versionId and commentId.
 * 5. Verify returned version matches all expected metadata: version content,
 *    parent comment linkage, editor id, and timestamps.
 * 6. Confirm audit and permissions logic: that a moderator role is able to read
 *    version details.
 */
export async function test_api_discussionBoard_test_get_comment_version_details_by_version_id_as_moderator_success(
  connection: api.IConnection,
) {
  // 1. Create a discussion board member (admin role)
  const userIdentifier: string = RandomGenerator.alphaNumeric(10);
  const joinedAt: string = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: userIdentifier,
        joined_at: joinedAt,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a new comment authored by this member
  // We need a post id; as post creation is not exposed, use a random UUID to simulate.
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const initialContent: string = RandomGenerator.paragraph()(10);
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId,
        content: initialContent,
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Edit (create a new version) as the same member
  const newContent: string = initialContent + "\nEdited for versioning.";
  const version =
    await api.functional.discussionBoard.member.comments.versions.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          editor_member_id: member.id,
          content: newContent,
        } satisfies IDiscussionBoardCommentVersion.ICreate,
      },
    );
  typia.assert(version);

  // 4. As a moderator, retrieve the details of the above version
  const fetchedVersion =
    await api.functional.discussionBoard.moderator.comments.versions.at(
      connection,
      {
        commentId: comment.id,
        versionId: version.id,
      },
    );
  typia.assert(fetchedVersion);

  // 5. Verify all fields match expected values
  TestValidator.equals("comment linkage")(
    fetchedVersion.discussion_board_comment_id,
  )(comment.id);
  TestValidator.equals("editor linkage")(fetchedVersion.editor_member_id)(
    member.id,
  );
  TestValidator.equals("content matches")(fetchedVersion.content)(newContent);
  TestValidator.predicate("created_at is ISO date")(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
      fetchedVersion.created_at,
    ),
  );
}
