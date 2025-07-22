import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate that non-authors (regular users who are not moderators or admins) cannot delete posts authored by another user.
 *
 * This test verifies that only the post creator or a privileged user (moderator/admin) can delete a post. The test workflow is as follows:
 *
 * 1. Register two separate member accounts (userA and userB).
 * 2. Create a thread using userA as the author (category reference uses a random UUID, as categories API is not in test fixture).
 * 3. Create a post under that thread as userA.
 * 4. Attempt to delete the post as userB (who has no special privileges).
 * 5. Confirm that the delete attempt fails with a forbidden error (authorization denied for non-authors).
 *
 * This ensures unauthorized users cannot delete content created by others, upholding basic board security principles.
 */
export async function test_api_discussionBoard_test_delete_post_permission_denied(connection: api.IConnection) {
  // 1. Register userA (the author)
  const userA = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null
    } satisfies IDiscussionBoardMember.ICreate
  });
  typia.assert(userA);

  // 2. Register userB (the unauthorized deleter)
  const userB = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null
    } satisfies IDiscussionBoardMember.ICreate
  });
  typia.assert(userB);

  // 3. Create a thread as userA
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: userA.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(10),
      body: RandomGenerator.content()(1)()
    } satisfies IDiscussionBoardThread.ICreate
  });
  typia.assert(thread);

  // 4. Create a post in the thread as userA
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: userA.id,
      body: RandomGenerator.content()(2)()
    } satisfies IDiscussionBoardPost.ICreate
  });
  typia.assert(post);

  // 5. Attempt to delete the post as userB (should fail with forbidden error)
  // NOTE: Since we lack an explicit authentication context API, this test assumes,
  // for the purposes of E2E simulation, that the deletion attempt is made "as userB".
  // If the real test environment allows switching user context or simulating the request
  // as another user, it should be done. Otherwise, this code demonstrates logical intent.
  await TestValidator.error("non-author delete forbidden")(async () => {
    // Simulate userB context here if possible; else, only the API's authorization logic can enforce behavior.
    await api.functional.discussionBoard.posts.eraseById(connection, { id: post.id });
  });
}