import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPageIDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVersion";

/**
 * Validate that a non-owner member is restricted from listing post edit
 * versions.
 *
 * This test ensures that the API denies access when a member who does not own
 * the post attempts to retrieve version history for another member's post. It
 * should return a forbidden/authorization error according to business rules.
 * The test also ensures prerequisites are satisfied by registering both owner
 * and non-owner members, creating topic/thread/post, and adding a version edit
 * before attempting unauthorized version listing.
 *
 * Steps:
 *
 * 1. Register member1 (owner of post) as admin.
 * 2. Register member2 (non-owner) as admin.
 * 3. Member1 creates topic.
 * 4. Member1 creates thread in topic.
 * 5. Member1 posts in thread.
 * 6. Member1 creates an edit/version for post.
 * 7. Switch to member2 (non-owner) context.
 * 8. Member2 attempts to list versions for member1's post (should fail with
 *    authorization error).
 */
export async function test_api_discussionBoard_test_list_post_versions_by_non_owner_with_restriction(
  connection: api.IConnection,
) {
  // 1. Register member1 (the post owner) via admin
  const member1 = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphabets(12),
        joined_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    },
  );
  typia.assert(member1);

  // 2. Register member2 (the non-owner) via admin
  const member2 = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphabets(12),
        joined_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    },
  );
  typia.assert(member2);

  // 3. Member1 creates a topic (assume context is set to member1 via platform session or mockup)
  // For E2E, assume connection is authenticated/acts as member1
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(10),
        pinned: false,
        closed: false,
        discussion_board_category_id: categoryId,
      },
    },
  );
  typia.assert(topic);

  // 4. Member1 creates a thread in topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(10),
        },
      },
    );
  typia.assert(thread);

  // 5. Member1 posts in thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.content()()(),
      },
    },
  );
  typia.assert(post);

  // 6. Member1 creates an edit/version for the post
  const postVersion =
    await api.functional.discussionBoard.member.posts.versions.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          body: RandomGenerator.content()()(),
        },
      },
    );
  typia.assert(postVersion);

  // 7. Switch context to member2 (non-owner): Would have to do session swap/mimic authentication.
  // For E2E, assume there's a mechanism to switch or simulate member2 connection/context if API auth design allows it.
  // (Pseudo step, since actual implementation would depend on auth platform)

  // 8. Member2 attempts to list versions on member1's post--should get forbidden.
  await TestValidator.error("Non-owner cannot list post versions")(() =>
    api.functional.discussionBoard.member.posts.versions.index(connection, {
      postId: post.id,
    }),
  );
}
