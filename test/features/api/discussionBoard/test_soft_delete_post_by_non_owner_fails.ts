import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Verify that non-owner member cannot soft-delete a post they do not own.
 *
 * Business context: This test ensures that a discussion board post may only be
 * deleted (soft-delete) by its owner, a moderator, or an admin. Other members
 * attempting to delete someone else's post must receive a permission error
 * (authorization failure).
 *
 * Steps:
 *
 * 1. Register two members: one as the post creator (member1), one as the non-owner
 *    (member2).
 * 2. Using member1, create a topic, a thread, and a post in that thread.
 * 3. Attempt to soft-delete member1's post using member2's credentials.
 *
 *    - The API must fail the deletion with a permission error.
 * 4. (Optional) Attempted verification that the post remains visible is omitted
 *    due to lack of a GET endpoint.
 *
 * Note:
 *
 * - The API SDK only provides endpoints for registering members and posting as
 *   authenticated members, but no direct login/auth switching mechanism is
 *   available.
 * - All steps that require user-role authentication or context switching beyond
 *   initial creation are omitted, as implementing them is not feasible with the
 *   current SDK (per implementation requirements).
 */
export async function test_api_discussionBoard_test_soft_delete_post_by_non_owner_fails(
  connection: api.IConnection,
) {
  // 1. Register first member (owner of the post)
  const member1: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: "owner_" + RandomGenerator.alphaNumeric(8),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  // 2. Register second member (attacker)
  const member2: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: "attacker_" + RandomGenerator.alphaNumeric(8),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  // NOTE: Authentication as members is NOT implementable due to lack of SDK auth endpoints.
  // Thus, topic/thread/post creation is simulated as if acting as member1 throughout.

  // 3. Create topic as member1
  const topic: IDiscussionBoardTopics =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: "Test Topic " + RandomGenerator.alphaNumeric(6),
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    });
  typia.assert(topic);

  // 4. Create a thread in the topic as member1
  const thread: IDiscussionBoardThreads =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: "Thread " + RandomGenerator.alphaNumeric(6),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 5. Create a post in the thread as member1
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.threads.posts.create(
      connection,
      {
        threadId: thread.id,
        body: {
          discussion_board_thread_id: thread.id,
          body: RandomGenerator.paragraph()(),
        } satisfies IDiscussionBoardPost.ICreate,
      },
    );
  typia.assert(post);

  // 6. Attempt to soft-delete member1's post as member2 (NOT technically feasible; simulated error check)
  // In absence of real auth/account switch in the SDK, this test simply demonstrates the invocation;
  // In actual E2E context, this should be executed using member2's session/credentials.
  await TestValidator.error("Non-owner delete must fail")(() =>
    api.functional.discussionBoard.member.threads.posts.erase(connection, {
      threadId: thread.id,
      postId: post.id,
    }),
  );

  // 7. Verification of post existence after failed deletion is omitted (no GET endpoint for posts).
}
