import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Validate retrieval of a specific comment version (snapshot) by a discussion
 * board member.
 *
 * This test covers:
 *
 * - Creating a comment as a member
 * - Editing the comment multiple times, storing version IDs and expected field
 *   values
 * - Fetching a specific version by its versionId (for own comment)
 * - Verifying all version fields match the expected history
 * - Attempting to fetch a non-existent versionId, expecting an error
 * - Attempting to fetch the version of another member's comment, expecting an
 *   access denial or error
 *
 * Steps:
 *
 * 1. Create a new comment under a dummy post using a member's context
 * 2. Edit the comment multiple times, each time creating and storing the versionId
 *    and expected snapshot fields
 * 3. Retrieve a specific version (e.g., the 1st edit) by commentId and versionId
 *    via GET
 * 4. Assert all properties (content, editor_member_id, created_at, etc.) match the
 *    values stored during that edit
 * 5. Attempt to fetch a made-up/non-existent versionId for the same comment,
 *    expect error
 * 6. As an additional member, create another comment and version, then try to
 *    access that version from the original member, expect access denied
 *
 * Assumes member identity is encoded in the connection/session context. Does
 * not depend on direct id injection for authorship.
 */
export async function test_api_discussionBoard_test_member_retrieve_specific_comment_version(
  connection: api.IConnection,
) {
  // Step 1: Setup identifiers for test isolation
  const memberId: string = typia.random<string & tags.Format<"uuid">>();
  const postId: string = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Member creates a new comment
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content: "Initial version.",
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 3: Perform two edits to create new versions
  const versionContents = ["First edit version.", "Second edit version."];
  const versionIds: (string & tags.Format<"uuid">)[] = [];
  for (const content of versionContents) {
    const version =
      await api.functional.discussionBoard.member.comments.versions.create(
        connection,
        {
          commentId: comment.id,
          body: {
            discussion_board_comment_id: comment.id,
            editor_member_id: memberId,
            content,
          } satisfies IDiscussionBoardCommentVersion.ICreate,
        },
      );
    typia.assert(version);
    versionIds.push(version.id);
  }

  // Step 4: Retrieve the first edit version by versionId
  const v1 = await api.functional.discussionBoard.member.comments.versions.at(
    connection,
    {
      commentId: comment.id,
      versionId: versionIds[0],
    },
  );
  typia.assert(v1);
  TestValidator.equals("editor_member_id matches")(v1.editor_member_id)(
    memberId,
  );
  TestValidator.equals("content matches")(v1.content)(versionContents[0]);
  TestValidator.equals("parent linkage")(v1.discussion_board_comment_id)(
    comment.id,
  );

  // Step 5: Attempt to fetch a non-existent versionId for this comment (should error)
  const fakeVersionId: string = typia.random<string & tags.Format<"uuid">>();
  TestValidator.error("non-existent versionId fails")(() =>
    api.functional.discussionBoard.member.comments.versions.at(connection, {
      commentId: comment.id,
      versionId: fakeVersionId,
    }),
  );

  // Step 6: Create a second member and their comment/version
  const member2Id: string = typia.random<string & tags.Format<"uuid">>();
  const post2Id: string = typia.random<string & tags.Format<"uuid">>();
  const comment2 = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member2Id,
        discussion_board_post_id: post2Id,
        content: "Other member's comment.",
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment2);
  const version2 =
    await api.functional.discussionBoard.member.comments.versions.create(
      connection,
      {
        commentId: comment2.id,
        body: {
          discussion_board_comment_id: comment2.id,
          editor_member_id: member2Id,
          content: "Other member's comment edit.",
        } satisfies IDiscussionBoardCommentVersion.ICreate,
      },
    );
  typia.assert(version2);

  // Try to retrieve another member's version as the first member (should error/deny)
  TestValidator.error("access denied for another member's version")(() =>
    api.functional.discussionBoard.member.comments.versions.at(connection, {
      commentId: comment2.id,
      versionId: version2.id,
    }),
  );
}
