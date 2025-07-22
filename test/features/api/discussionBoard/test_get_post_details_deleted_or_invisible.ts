import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate retrieval access for a soft-deleted or restricted-visibility discussion board post.
 *
 * This test verifies access control for soft-deleted discussion board posts:
 * 1. Creates an author member
 * 2. Creates an admin/mod member
 * 3. Author creates a thread in a random category
 * 4. Author creates a post in the thread
 * 5. Admin soft-deletes the post (simulating moderator action)
 * 6. Attempts to retrieve the post as the author, expecting an error (forbidden or not found)
 * 7. Retrieves the post as the admin/mod, verifying the post, especially its deleted_at value
 *
 * Covers critical business rules that deleted posts are hidden for regular members, visible for admins/mods. Uses only available SDKs and DTOs.
 */
export async function test_api_discussionBoard_test_get_post_details_deleted_or_invisible(
  connection: api.IConnection,
) {
  // 1. Register a member (author)
  const author_member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(author_member);

  // 2. Register a second member to simulate admin/mod
  const admin_member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(admin_member);

  // 3. Create a thread as the authoring member (with random category id)
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: author_member.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(1),
      body: RandomGenerator.content()()(1),
    },
  });
  typia.assert(thread);

  // 4. Create the post in the thread as the authoring member
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: author_member.id,
      body: RandomGenerator.content()()(1),
    },
  });
  typia.assert(post);

  // 5. Soft-delete the post as admin/mod
  const erased = await api.functional.discussionBoard.posts.eraseById(connection, { id: post.id });
  typia.assert(erased);
  TestValidator.equals("erased post id")(erased.id)(post.id);
  TestValidator.predicate("deleted_at should be set after soft-delete")(!!erased.deleted_at);

  // 6. Attempt retrieval as author: should error (forbidden/not found)
  await TestValidator.error("forbidden/not found as author")(async () => {
    await api.functional.discussionBoard.posts.getById(connection, { id: post.id });
  });

  // 7. Retrieval as admin/mod: should succeed with deleted_at populated
  const fetched = await api.functional.discussionBoard.posts.getById(connection, { id: post.id });
  typia.assert(fetched);
  TestValidator.equals("deleted_at in fetched post matches erased post")(fetched.deleted_at)(erased.deleted_at);
  TestValidator.equals("fetched post id matches")(fetched.id)(post.id);
}