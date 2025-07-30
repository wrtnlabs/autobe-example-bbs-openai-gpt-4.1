import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVersion";

/**
 * Validates that a regular member cannot update a post version using the admin
 * endpoint.
 *
 * This test ensures that access control is enforced – a member using member
 * endpoints for creation and then attempting to update a post version using the
 * admin/moderator endpoint (which only permits privileged roles) should receive
 * an error, and the update must not succeed.
 *
 * Step-by-step process:
 *
 * 1. Register an admin user for setup (via admin endpoint)
 * 2. Register a regular member (to perform member-context actions)
 * 3. (Assume context/session can be switched by API connection internally)
 * 4. As the member, create a topic
 * 5. As the member, create a thread in the topic
 * 6. As the member, create a post in the thread
 * 7. As the member, create a version of the post
 * 8. As the member, attempt to update the version using the admin update endpoint
 *    (should fail with permission error)
 */
export async function test_api_discussionBoard_test_update_post_version_by_non_admin_should_fail(
  connection: api.IConnection,
) {
  // 1. Register admin user (for setup only)
  const admin_identifier = "admin-" + RandomGenerator.alphaNumeric(10);
  const admin_member =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: admin_identifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(admin_member);

  // 2. Register regular member
  const member_identifier = "member-" + RandomGenerator.alphaNumeric(10);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: member_identifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // ----- Context switch to 'member' assumed by infra; no helper invented -----

  // 3. Member creates a topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphaNumeric(12),
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 4. Member creates a thread in the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.alphaNumeric(15),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 5. Member creates a post in the thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
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

  // 6. Member creates a version for their post
  const version =
    await api.functional.discussionBoard.member.posts.versions.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          body: "Initial version content",
        } satisfies IDiscussionBoardPostVersion.ICreate,
      },
    );
  typia.assert(version);

  // 7. Member attempts forbidden version update via admin endpoint (should fail)
  await TestValidator.error(
    "Regular member may not update version via admin endpoint",
  )(async () => {
    await api.functional.discussionBoard.admin.posts.versions.update(
      connection,
      {
        postId: post.id,
        versionId: version.id,
        body: {
          body: "Malicious update attempt by non-admin",
        } satisfies IDiscussionBoardPostVersion.IUpdate,
      },
    );
  });
}
