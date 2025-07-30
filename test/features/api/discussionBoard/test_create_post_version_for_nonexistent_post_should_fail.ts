import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVersion";

/**
 * Ensure the API does not allow creating a post version for a non-existent
 * post.
 *
 * Business context: Editing revision history in a discussion board must be
 * robust against references to invalid posts. This test verifies the system
 * rejects attempts to create a post version for a non-existent postId: it
 * should return an error (not found), perform no creation, and not leak type or
 * access information.
 *
 * Steps:
 *
 * 1. Register a valid member using the admin endpoint.
 * 2. Attempt to create a version for a random (but valid-format) postId that does
 *    not correspond to an existing post.
 * 3. Assert that the API throws an error and does not create a version.
 */
export async function test_api_discussionBoard_test_create_post_version_for_nonexistent_post_should_fail(
  connection: api.IConnection,
) {
  // 1. Create a test member (admin required)
  const memberInput = {
    user_identifier: typia.random<string>(),
    joined_at: new Date().toISOString(),
  } satisfies IDiscussionBoardMember.ICreate;
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: memberInput,
    },
  );
  typia.assert(member);

  // 2. Attempt to create a post version for a post ID that does not exist
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  const postVersionInput = {
    discussion_board_post_id: fakePostId,
    body: "Edit attempt for non-existent post.",
  } satisfies IDiscussionBoardPostVersion.ICreate;

  await TestValidator.error(
    "Creating version for non-existent post should fail",
  )(() =>
    api.functional.discussionBoard.member.posts.versions.create(connection, {
      postId: fakePostId,
      body: postVersionInput,
    }),
  );
}
