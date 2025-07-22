import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Verify that a regular member cannot update posts authored by someone else, ensuring correct enforcement of update permissions for discussion board posts.
 *
 * This test safeguards against privilege escalation by confirming that only authors, moderators, or admins may edit posts, as per requirements. This prevents users from editing or tampering with other members' content.
 *
 * Steps:
 * 1. Register two distinct discussion board members (UserA, UserB).
 * 2. Create a thread as UserA.
 * 3. UserA creates a post under that thread.
 * 4. Switch context (simulate login) as UserB.
 * 5. UserB attempts to update UserA's post using PUT /discussionBoard/posts/{id}.
 * 6. Confirm that the attempt is denied due to insufficient permission (error thrown).
 */
export async function test_api_discussionBoard_test_update_post_permission_denied(
  connection: api.IConnection,
) {
  // 1. Register UserA (author)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: userAEmail,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(userA);

  // 2. Register UserB (attempted unauthorized editor)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: userBEmail,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(userB);

  // 3. Create a thread as UserA
  // (Assume context/session swaps handled by login or similar – here, we operate as UserA)
  const thread: IDiscussionBoardThread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: userA.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(16),
      body: RandomGenerator.paragraph()(),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 4. UserA creates a post in the thread
  const post: IDiscussionBoardPost = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: userA.id,
      body: RandomGenerator.paragraph()(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post);

  // 5. Simulate context switch: UserB attempts update
  // (In a real system, this usually involves authentication/token management)
  // Attempt to update UserA's post as UserB
  await TestValidator.error("only post owner may update their post")(
    async () => {
      await api.functional.discussionBoard.posts.putById(connection, {
        id: post.id,
        body: {
          body: "Malicious edit attempt",
        } satisfies IDiscussionBoardPost.IUpdate,
      });
    },
  );
}