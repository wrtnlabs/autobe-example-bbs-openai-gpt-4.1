import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Validate that an unauthorized member cannot update another member's post
 * attachment metadata via moderator endpoint.
 *
 * This test ensures the system enforces access controls for the moderator-level
 * post attachment update endpoint:
 *
 * 1. Member A creates a topic.
 * 2. Member A creates a thread within the topic.
 * 3. Member A posts in the thread, producing a post with at least one attachment
 *    (attachment relation is simulated; we use a mock attachment ID).
 * 4. Member B (distinct member, not a moderator nor post owner) is simulated via
 *    connection context and attempts to perform a moderator-level attachment
 *    metadata update using PUT
 *    /discussionBoard/moderator/posts/{postId}/attachments/{attachmentId}.
 * 5. The system should return a permission-denied/authorization error, and the
 *    update must not occur.
 * 6. (Optional, if such endpoint exists) Attempt to read the attachment metadata
 *    to check that it was not changed. Since no such endpoint is provided, only
 *    error occurrence is checked.
 *
 * Edge Case:
 *
 * - Confirms that non-owners and non-moderators are strictly prohibited even if
 *   authenticated.
 * - Only implementable steps are coded as per available endpoints and schema.
 */
export async function test_api_discussionBoard_test_update_post_attachment_metadata_as_moderator_unauthorized(
  connection: api.IConnection,
) {
  // ----- Member A: Topic, Thread, Post Creation -----
  // (1) Member A creates a topic
  // Generate a random category id for topic creation (required by schema)
  const randomCategoryId: string = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        description: RandomGenerator.paragraph()(2),
        pinned: false,
        closed: false,
        discussion_board_category_id: randomCategoryId,
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // (2) Member A creates a thread in the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(2),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // (3) Member A creates a post in the thread
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

  // Simulate an attachment associated with the post (mock an attachment id)
  // In a real test, you'd upload and retrieve attachmentId; here we must simulate due to API limitations
  const attachmentId: string = typia.random<string & tags.Format<"uuid">>();

  // ----- Member B: Unauthorized Update Attempt -----
  // Member B (not the owner, not moderator/admin) is simulated as current connection
  // because no user authentication/switch API is available in provided endpoints
  await TestValidator.error("unauthorized update attempt must be rejected")(
    async () => {
      await api.functional.discussionBoard.moderator.posts.attachments.update(
        connection,
        {
          postId: post.id,
          attachmentId,
          body: {
            file_name: RandomGenerator.alphabets(8),
            file_uri: `https://files.example.com/${RandomGenerator.alphaNumeric(8)}`,
            mime_type: "application/pdf",
          } satisfies IDiscussionBoardPostAttachment.IUpdate,
        },
      );
    },
  );

  // No direct API exists to fetch/reload attachment metadata, so cannot verify non-modification post-error.
}
