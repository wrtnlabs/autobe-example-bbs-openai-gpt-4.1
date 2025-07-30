import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test: Moderator advanced search and filter for comments by content
 * keyword, including pagination and deleted status.
 *
 * This test thoroughly validates the moderator's ability to retrieve only
 * comments containing specific content keywords, handling pagination and
 * visibility of deleted comments:
 *
 * 1. Registers a new member via admin API for controlled authorship.
 * 2. Creates a topic with random category id (category existence assumed).
 * 3. Adds a thread under the topic.
 * 4. Posts into the thread.
 * 5. Creates a set of comments under the post: several contain a unique keyword
 *    (match group), some with a unique decoy keyword (decoy group).
 * 6. (Omitted: soft-delete, as no such API exists—cannot test visibility of
 *    deleted items.)
 * 7. Searches as moderator for the match keyword; asserts only matching comments
 *    are returned, no decoys, and pagination fields are valid.
 * 8. Further asserts that all returned comment contents contain the keyword and
 *    never contain the decoy.
 *
 * If/when a soft-delete endpoint is exposed, the test should be extended to
 * verify deleted record visibility to moderators.
 */
export async function test_api_discussionBoard_test_moderator_advanced_search_comments_by_content_keywords(
  connection: api.IConnection,
) {
  // 1. Provision a new test member for clean authorship
  const memberUserIdentifier = `moderator_test_member_${RandomGenerator.alphaNumeric(6)}`;
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberUserIdentifier,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Create a topic (requires assumed valid category uuid)
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: `Mod AdvSearch Test Topic ${RandomGenerator.alphaNumeric(4)}`,
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        // If category API existed, we'd create then use that here.
      },
    },
  );
  typia.assert(topic);

  // 3. Add a thread to the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: `AdvSearch Thread ${RandomGenerator.alphaNumeric(6)}`,
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
        body: "Seed post for advanced moderator search test.",
      },
    },
  );
  typia.assert(post);

  // 5. Create comments for keyword search and false-positive test
  const keyword = "MODTESTKEYWORD";
  const decoyKeyword = "XYZDEC0Y";
  const matchTexts = [
    `This is a ${keyword} comment`,
    `${keyword} at start`,
    `Ends with keyword ${keyword}`,
    `Surround ${keyword} middled`,
    `Extra ${keyword} repeat ${keyword}`,
  ];
  const decoyTexts = [
    `Just banality, no keyword`,
    `Decoy: ${decoyKeyword}`,
    `Totally unrelated content`,
  ];
  // Insert matching comments
  for (const content of matchTexts) {
    const created = await api.functional.discussionBoard.member.comments.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          discussion_board_post_id: post.id,
          content,
        },
      },
    );
    typia.assert(created);
  }
  // Insert decoys
  for (const content of decoyTexts) {
    const created = await api.functional.discussionBoard.member.comments.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          discussion_board_post_id: post.id,
          content,
        },
      },
    );
    typia.assert(created);
  }

  // 6. (Omitted: soft-delete one comment, as no API exists for that)

  // 7. Perform moderator keyword search
  const result = await api.functional.discussionBoard.moderator.comments.search(
    connection,
    {
      body: {
        content_contains: keyword,
      },
    },
  );
  typia.assert(result);

  // 8. Assert all returned comment contents strictly include the keyword and never the decoy
  TestValidator.predicate("all returned comments contain search keyword")(
    result.data.every((x) => x.content.includes(keyword)),
  );
  TestValidator.predicate("no returned comments contain decoy keyword")(
    result.data.every((x) => !x.content.includes(decoyKeyword)),
  );

  // 9. Assert pagination metadata integrity
  TestValidator.predicate("pagination metadata present")(
    !!result.pagination && typeof result.pagination === "object",
  );
  TestValidator.predicate("no more returned than limit")(
    result.data.length <= result.pagination.limit,
  );
  TestValidator.predicate("record count plausible")(
    result.pagination.records >= result.data.length,
  );
}
