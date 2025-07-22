import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate rejection of post creation on a closed discussion thread.
 *
 * This test ensures that when a thread is set to the closed state, attempts to create new posts within that thread are properly rejected by the system, enforcing moderation and discussion board rules.
 *
 * Business context:
 * - Members must not be able to reply to threads marked as closed (is_closed = true), as per moderation policy.
 *
 * Test process:
 * 1. Register a new discussion board member (for authentication and authorship of all content).
 * 2. Create a new discussion board thread with the member as author, using any available category ID (must be valid format).
 * 3. Update the thread's is_closed property to true to indicate that it is closed for further replies.
 * 4. Attempt to create a post in the closed thread as the same member.
 * 5. Confirm that the system rejects the post creation with an error (error occurrence is validated, not message).
 */
export async function test_api_discussionBoard_test_create_post_in_closed_thread(
  connection: api.IConnection,
) {
  // 1. Register discussion board member
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Create thread (use random category ID)
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: member.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(1),
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 3. Close the thread via update
  const closedThread = await api.functional.discussionBoard.threads.putById(connection, {
    id: thread.id,
    body: { is_closed: true } satisfies IDiscussionBoardThread.IUpdate,
  });
  typia.assert(closedThread);
  TestValidator.equals("thread is closed")(closedThread.is_closed)(true);

  // 4. Attempt to create a post in the closed thread, expect rejection
  await TestValidator.error("cannot post to closed thread")(
    async () => {
      await api.functional.discussionBoard.posts.post(connection, {
        body: {
          discussion_board_thread_id: thread.id,
          discussion_board_member_id: member.id,
          body: RandomGenerator.content()()(),
        } satisfies IDiscussionBoardPost.ICreate,
      });
    }
  );
}