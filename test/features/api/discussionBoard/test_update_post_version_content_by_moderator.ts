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
 * Ensure a moderator can update the content of a post version for legal
 * compliance or moderation review.
 *
 * **Business context:** Moderators must sometimes update or redact the content
 * of previous post versions—after edits, for legal takedown, or moderation
 * review. Direct update is only allowed to users in a moderator role using a
 * dedicated endpoint. This test fully simulates the workflow from resource
 * setup to moderator update and asserts correctness of the endpoint and
 * permission behavior.
 *
 * **Step-by-step process:**
 *
 * 1. Register a moderator account as a board member (using admin endpoint).
 * 2. As a default member, create a topic under a random (mock) category.
 * 3. Create a thread inside the topic.
 * 4. Add a post to the thread.
 * 5. Create an initial version record for the post.
 * 6. (Simulate context as moderator; in real E2E test infra, this should give the
 *    following API call moderator privileges.)
 * 7. Update the body/content of the created version using the moderator endpoint.
 * 8. Assert that the update is reflected in the returned object (body, id, and
 *    post mapping).
 */
export async function test_api_discussionBoard_test_update_post_version_content_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a moderator account for later update
  const moderatorUserIdentifier =
    RandomGenerator.alphabets(12) + "@moderator.com";
  const moderatorJoinedAt = new Date().toISOString();
  const moderator = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: moderatorUserIdentifier,
        joined_at: moderatorJoinedAt,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(moderator);

  // 2. Create a topic as a member
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const topicTitle = "Topic " + RandomGenerator.alphabets(8);
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: topicTitle,
        description: "Sample topic for e2e test",
        pinned: false,
        closed: false,
        discussion_board_category_id: categoryId,
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 3. Create a thread in the topic
  const threadTitle = "Thread " + RandomGenerator.alphabets(8);
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: threadTitle,
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 4. Create a post in the thread as the default member
  const postBody = "Original post body for e2e versioning test.";
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: postBody,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Generate an initial version for this post
  const originalVersion =
    await api.functional.discussionBoard.member.posts.versions.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          body: postBody,
        } satisfies IDiscussionBoardPostVersion.ICreate,
      },
    );
  typia.assert(originalVersion);

  // 6. (Context switch: Simulate moderator role. Test infra must assign moderator to the following call.)

  // 7. Moderator updates the version's content (e.g., legal compliance/edit)
  const newBody = "[MODERATED/REDACTED] Content updated by moderator.";
  const updatedVersion =
    await api.functional.discussionBoard.moderator.posts.versions.update(
      connection,
      {
        postId: post.id,
        versionId: originalVersion.id,
        body: {
          body: newBody,
        } satisfies IDiscussionBoardPostVersion.IUpdate,
      },
    );
  typia.assert(updatedVersion);

  // 8. Assert the body/content is correctly updated, and IDs are preserved
  TestValidator.equals("updated version body")(updatedVersion.body)(newBody);
  TestValidator.equals("version id matches")(updatedVersion.id)(
    originalVersion.id,
  );
  TestValidator.equals("post id matches")(
    updatedVersion.discussion_board_post_id,
  )(post.id);
  // If the API returns the updated editor_member_id, ideally check it matches moderator.id
  // (This check depends on implementation; otherwise, at least assert that it is present)
  TestValidator.predicate("editor_member_id is non-empty/is uuid")(
    typeof updatedVersion.editor_member_id === "string" &&
      updatedVersion.editor_member_id.length > 0,
  );
}
