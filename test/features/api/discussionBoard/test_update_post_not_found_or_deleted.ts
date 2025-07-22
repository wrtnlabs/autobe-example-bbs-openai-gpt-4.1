import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Test updating a post that does not exist or is already soft-deleted.
 *
 * This E2E test verifies two important failure scenarios for the discussion board post update API:
 *
 * 1. Attempt to update a post using a completely random non-existent UUID.
 *    - The API should return a 'not found' or similar error, and no record should be updated.
 *
 * 2. Attempt to update a post that exists, but has already been soft-deleted (deleted_at populated).
 *    - The API should return an 'invalid state' or 'not found' error; no update should be applied to the record.
 *
 * To test these, the function will:
 * 1. Create a member (owner of test post)
 * 2. Create a thread
 * 3. Create a post under the thread by the member
 * 4. Soft-delete the post
 * 5. Attempt to update the deleted post (expecting error)
 * 6. Attempt to update using a random (non-existent) UUID (expecting error)
 *
 * Both operations must fail gracefully and not update or create any records.
 */
export async function test_api_discussionBoard_test_update_post_not_found_or_deleted(
  connection: api.IConnection,
) {
  // 1. Create a member
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(20),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, { body: memberInput });
  typia.assert(member);

  // 2. Create a thread
  const threadInput: IDiscussionBoardThread.ICreate = {
    discussion_board_member_id: member.id,
    discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(10),
    body: RandomGenerator.content()(5)(),
  };
  const thread = await api.functional.discussionBoard.threads.post(connection, { body: threadInput });
  typia.assert(thread);

  // 3. Create a post
  const postInput: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: thread.id,
    discussion_board_member_id: member.id,
    body: RandomGenerator.content()(3)(),
  };
  const post = await api.functional.discussionBoard.posts.post(connection, { body: postInput });
  typia.assert(post);

  // 4. Soft-delete the post
  const deleted = await api.functional.discussionBoard.posts.eraseById(connection, { id: post.id });
  typia.assert(deleted);

  // 5. Attempt to update the soft-deleted post, should error
  await TestValidator.error("Soft-deleted post should not be updatable")(
    () => api.functional.discussionBoard.posts.putById(connection, {
      id: post.id,
      body: { body: "Update attempt after delete", is_edited: true },
    })
  );

  // 6. Attempt to update a post with a completely random UUID, should error
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Non-existent post ID should return not found error")(
    () => api.functional.discussionBoard.posts.putById(connection, {
      id: randomUuid,
      body: { body: "This should also fail", is_edited: true },
    })
  );
}