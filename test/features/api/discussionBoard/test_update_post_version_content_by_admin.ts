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
 * Validate that an admin can update the content of an existing post version for
 * redaction/correction.
 *
 * This scenario confirms discussion board moderation process compliance:
 *
 * - Only admins can update post version content.
 * - Updated content must appear in the version entity.
 * - Audit/log is generated (response fields are checked; actual log persistence
 *   is out of scope).
 *
 * Test steps:
 *
 * 1. Register an admin member for system-level authorization.
 * 2. Register a general member to own the post content.
 * 3. Member creates a new topic (requires category id — random UUID for required
 *    field suffices).
 * 4. Member creates a new thread in that topic.
 * 5. Member creates a post in the thread.
 * 6. Member creates a version (edit) of the post.
 * 7. Switch to admin identity.
 * 8. Update the post version's body as admin.
 * 9. Validate that the version entity has the new body and updated fields.
 *
 * Negative scenarios (SKIPPED):
 *
 * - Attempting update as regular member/user (insufficient privileges) – cannot
 *   be covered as there is no explicit member update endpoint.
 * - Passing null/undefined body – rejected by type system (not
 *   implemented/testable here).
 */
export async function test_api_discussionBoard_test_update_post_version_content_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const admin_user_identifier: string = RandomGenerator.alphaNumeric(16);
  const admin_member =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: admin_user_identifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(admin_member);

  // 2. Register a regular member
  const member_user_identifier: string = RandomGenerator.alphaNumeric(16);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: member_user_identifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // -- Simulate member authentication for content creation (SDK has no login, so this is conceptual only)

  // 3. Member creates a topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(4),
        description: RandomGenerator.paragraph()(2),
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
          title: RandomGenerator.paragraph()(3),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 5. Member creates a post in that thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.content()()(),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Member creates a version for the post
  const post_version =
    await api.functional.discussionBoard.member.posts.versions.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          body: RandomGenerator.content()()(),
        } satisfies IDiscussionBoardPostVersion.ICreate,
      },
    );
  typia.assert(post_version);

  // -- Simulate admin authentication for moderation action

  // 7 & 8. Admin updates the post version with new body text
  const updated_body = RandomGenerator.content()()() + "\n[redacted by admin]";
  const updated_version =
    await api.functional.discussionBoard.admin.posts.versions.update(
      connection,
      {
        postId: post.id,
        versionId: post_version.id,
        body: {
          body: updated_body,
        } satisfies IDiscussionBoardPostVersion.IUpdate,
      },
    );
  typia.assert(updated_version);

  // 9. Validate updated content and metadata
  TestValidator.equals("version id matches, unchanged")(updated_version.id)(
    post_version.id,
  );
  TestValidator.equals("post id unchanged")(
    updated_version.discussion_board_post_id,
  )(post.id);
  TestValidator.equals("body updated")(updated_version.body)(updated_body);
  TestValidator.equals("editor unchanged (unless explicitly re-attributed)")(
    updated_version.editor_member_id,
  )(post_version.editor_member_id);
  TestValidator.equals("version number constant")(updated_version.version)(
    post_version.version,
  );
  TestValidator.predicate(
    "created_at should remain unchanged; update does NOT affect created_at",
  )(updated_version.created_at === post_version.created_at);
}
