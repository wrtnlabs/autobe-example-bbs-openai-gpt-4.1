import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostVersion";

/**
 * Test invalid or malformed filters in searching post version history.
 *
 * This workflow checks the endpoint responsible for searching a post's version
 * history (audit trail) with intentionally bad parameters:
 *
 * - Search by a non-existent editor_member_id (random/nonexistent UUID)
 * - Search with an impossible version number range (versionFrom > versionTo)
 * - Search with improper pagination (e.g., negative page number, excessive limit)
 *
 * Preparation (dependencies):
 *
 * 1. Register a new board member (admin)
 * 2. Create a topic for posting
 * 3. Create a thread in that topic
 * 4. Post a post in the thread
 * 5. Create at least one version for the test post
 *
 * Execution (invalid search scenarios): 6. Attempt search with non-existent
 * editor_member_id (should give empty result) 7. Attempt search with version
 * number range where versionFrom > versionTo (should error or return empty) 8.
 * Attempt search with improper pagination (e.g., page=-1, limit=10000), expect
 * validation error or fallback behavior
 *
 * Edge Cases:
 *
 * - All error cases should be handled via assertions: error thrown, validation
 *   failure, or proper empty result as per API design
 * - Confirm that valid searches do succeed to ensure setup is correct
 */
export async function test_api_discussionBoard_test_search_post_versions_with_invalid_filters(
  connection: api.IConnection,
) {
  // 1. Register a board member (admin-powered registration)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Create a topic (requires a category UUID)
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.content()()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 3. Create a thread in the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(1),
        },
      },
    );
  typia.assert(thread);

  // 4. Create a post in the thread
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

  // 5. Create a version for the post
  const version =
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
  typia.assert(version);

  // 6. Search with a non-existent editor_member_id: should return empty result
  const bogusEditorId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.discussionBoard.member.posts.versions.search(
      connection,
      {
        postId: post.id,
        body: { editor_member_id: bogusEditorId },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("Should be empty result when editor doesn't match")(
    emptyResult.data.length,
  )(0);

  // 7. Search with versionFrom > versionTo: should throw error or return empty set
  await TestValidator.error("versionFrom > versionTo is invalid")(() =>
    api.functional.discussionBoard.member.posts.versions.search(connection, {
      postId: post.id,
      body: { versionFrom: 10, versionTo: 2 },
    }),
  );

  // 8. Search with improper pagination: negative page, excessive limit
  await TestValidator.error("Negative page and huge limit are invalid")(() =>
    api.functional.discussionBoard.member.posts.versions.search(connection, {
      postId: post.id,
      body: { pagination: { page: -1, limit: 10000 } },
    }),
  );

  // 9. Control: Valid search should succeed
  const validSearch =
    await api.functional.discussionBoard.member.posts.versions.search(
      connection,
      {
        postId: post.id,
        body: {},
      },
    );
  typia.assert(validSearch);
  TestValidator.predicate("At least one version exists for our setup")(
    validSearch.data.length >= 1,
  );
}
