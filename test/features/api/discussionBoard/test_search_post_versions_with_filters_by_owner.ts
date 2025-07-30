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
 * Test searching/filtering post version history by post owner using advanced
 * filters.
 *
 * This test validates that a member (the post owner) can retrieve post version
 * history using various search filters—such as editor_member_id, version number
 * range, and date filters—on their own post. The flow checks that only the
 * matching post versions are returned per filter and validates correct access
 * control and logic.
 *
 * Workflow steps:
 *
 * 1. Register a board member (admin-only backoffice, so use create API directly)
 * 2. Member creates a new topic.
 * 3. Member creates a new thread under the topic.
 * 4. Member posts a message in the thread.
 * 5. Member edits the post multiple times, creating additional versions.
 * 6. Use the PATCH /versions endpoint to filter post versions: a. By
 *    editor_member_id b. By exact version number or range c. By date/time range
 *    d. Using content substring
 * 7. For each search, verify only the expected versions are returned, and that
 *    each returned post version matches the intended filter conditions. Also
 *    check pagination metadata is present.
 */
export async function test_api_discussionBoard_test_search_post_versions_with_filters_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a board member
  const user_identifier = RandomGenerator.alphaNumeric(16);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Member creates a topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.paragraph()(2),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 3. Member creates a thread under the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: { title: RandomGenerator.paragraph()(1) },
      },
    );
  typia.assert(thread);

  // 4. Member posts a post in the thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.content()(1)(),
      },
    },
  );
  typia.assert(post);

  // 5. Member edits the post multiple times (create several versions)
  const version_bodies = [
    RandomGenerator.content()(2)(),
    RandomGenerator.content()(3)(),
    RandomGenerator.content()(1)(),
  ];
  const versions: IDiscussionBoardPostVersion[] = [];

  for (const body of version_bodies) {
    const version =
      await api.functional.discussionBoard.member.posts.versions.create(
        connection,
        {
          postId: post.id,
          body: {
            discussion_board_post_id: post.id,
            body,
          },
        },
      );
    typia.assert(version);
    versions.push(version);
  }

  // Retrieve all versions to get full edit history for baseline
  const all_versions_result =
    await api.functional.discussionBoard.member.posts.versions.search(
      connection,
      {
        postId: post.id,
        body: { discussion_board_post_id: post.id },
      },
    );
  typia.assert(all_versions_result);
  const all_versions = all_versions_result.data;

  // 6a. Filter by editor_member_id (should only match our member)
  const by_editor_result =
    await api.functional.discussionBoard.member.posts.versions.search(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          editor_member_id: member.id,
        },
      },
    );
  typia.assert(by_editor_result);
  TestValidator.predicate("all editor_member_id match")(
    by_editor_result.data.every((v) => v.editor_member_id === member.id),
  );

  // 6b. Filter by version number (should return expected version)
  // Pick a version to filter for a single version number
  const versionToTest = all_versions[1];
  const by_version_result =
    await api.functional.discussionBoard.member.posts.versions.search(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          versionFrom: versionToTest.version,
          versionTo: versionToTest.version,
        },
      },
    );
  typia.assert(by_version_result);
  TestValidator.equals("single version match")(by_version_result.data.length)(
    1,
  );
  if (by_version_result.data.length === 1) {
    TestValidator.equals("version object matches")(
      by_version_result.data[0].id,
    )(versionToTest.id);
  }

  // 6c. Filter by created_from and created_to (date/time)
  // Find created_at of a version and filter using it
  const dateVersion = all_versions[0];
  const by_date_result =
    await api.functional.discussionBoard.member.posts.versions.search(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          createdFrom: dateVersion.created_at,
          createdTo: dateVersion.created_at,
        },
      },
    );
  typia.assert(by_date_result);
  // All should have created_at === the selected version's created_at
  TestValidator.predicate("all created_at within date filter")(
    by_date_result.data.every((v) => v.created_at === dateVersion.created_at),
  );

  // 6d. Filter using contentSubstring
  const substring = version_bodies[1].slice(0, 5); // take start of second edited body
  const by_content_result =
    await api.functional.discussionBoard.member.posts.versions.search(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          contentSubstring: substring,
        },
      },
    );
  typia.assert(by_content_result);
  TestValidator.predicate("all version bodies include substring")(
    by_content_result.data.every((v) => v.body.includes(substring)),
  );

  // 7. Confirm all paginated result includes pagination object
  for (const res of [
    all_versions_result,
    by_editor_result,
    by_version_result,
    by_date_result,
    by_content_result,
  ]) {
    TestValidator.predicate("result contains pagination")(
      !!res.pagination && typeof res.pagination.pages === "number",
    );
  }
}
