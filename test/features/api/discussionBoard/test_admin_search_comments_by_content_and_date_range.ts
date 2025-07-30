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
 * Validate admin-side advanced comment search with multiple filters and edge
 * cases.
 *
 * This test ensures that the admin API returns correct filtered results and
 * pagination for comment searches.
 *
 * Steps:
 *
 * 1. Register a board member for comment authorship (via admin endpoint).
 * 2. As that member, create a topic.
 * 3. Create a thread under the topic.
 * 4. Add a post to the thread.
 * 5. Create 3 comments on the post: each with unique content and with manual
 *    delays to control timestamps.
 * 6. As admin, search comments containing a specific substring — only matching
 *    comments should appear.
 * 7. Search by created_at range to yield a temporal subset of comments.
 * 8. Search with compound filter (substring + date range) for strictest filtering.
 * 9. Search with a content filter that should yield no results — confirm
 *    zero-length data.
 * 10. Validate all returned comment IDs/content correspond to expected test data,
 *     and validate pagination metadata.
 */
export async function test_api_discussionBoard_test_admin_search_comments_by_content_and_date_range(
  connection: api.IConnection,
) {
  // 1. Register a board member via admin API
  const memberUserIdentifier = `testuser_admin_search_${RandomGenerator.alphabets(8)}`;
  const memberJoinedAt = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberUserIdentifier,
        joined_at: memberJoinedAt,
      },
    },
  );
  typia.assert(member);

  // 2. As this member, create a topic (category UUID must be synthetic here)
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: `E2E Test Topic ${RandomGenerator.alphabets(6)}`,
        description: "Testing comment search filters.",
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 3. Create a thread in that topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: `E2E Test Thread ${RandomGenerator.alphabets(8)}`,
        },
      },
    );
  typia.assert(thread);

  // 4. Add a post to the thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: "This is the parent post for E2E comment search.",
      },
    },
  );
  typia.assert(post);

  // 5. Create 3 comments with unique content and manual time separation
  const now = new Date();
  const comments: Array<{ id: string; content: string; created_at: string }> =
    [];
  for (const [ix, keyword] of ["alpha", "beta", "gamma"].entries()) {
    // Control created_at via natural progression (API is not guaranteed to expose created_at mutation, so let it auto-increment)
    const content = `E2E content ${keyword} ${RandomGenerator.alphabets(5)}`;
    const comment = await api.functional.discussionBoard.member.comments.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          discussion_board_post_id: post.id,
          content,
        },
      },
    );
    typia.assert(comment);
    comments.push({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
    });
    // Small delay to stagger created_at timestamps
    await new Promise((r) => setTimeout(r, 1200));
  }
  // Sort by created_at ascending for easier later range calculation
  comments.sort((a, b) => a.created_at.localeCompare(b.created_at));

  // 6. Search by substring for "beta" - expect exactly one matching comment
  {
    const keyword = "beta";
    const adminSearch =
      await api.functional.discussionBoard.admin.comments.search(connection, {
        body: {
          content_contains: keyword,
        },
      });
    typia.assert(adminSearch);
    const matches = adminSearch.data;
    TestValidator.equals("matched count for beta keyword")(1)(matches.length);
    TestValidator.equals("matched comment content for beta keyword")(
      matches[0].content.includes("beta"),
    )(true);
    TestValidator.equals("matched comment id matches")(matches[0].id)(
      comments.find((c) => c.content.includes("beta"))!.id,
    );
  }

  // 7. Search by created_at window to match only the 2nd and 3rd comments (exclude oldest)
  {
    const createdAtFrom = comments[1].created_at;
    const adminSearch =
      await api.functional.discussionBoard.admin.comments.search(connection, {
        body: {
          created_at_from: createdAtFrom,
        },
      });
    typia.assert(adminSearch);
    const found = adminSearch.data.filter((row) =>
      comments.some((x) => x.id === row.id),
    );
    TestValidator.equals("created_at_from picks correct comments")(
      found.length,
    )(2);
    for (const c of comments.slice(1)) {
      TestValidator.predicate(`comment with id=${c.id} is in search result`)(
        found.some((row) => row.id === c.id),
      );
    }
  }

  // 8. Compound filter (content_contains = gamma + created_at_from for 3rd comment)
  {
    const c = comments[2];
    const adminSearch =
      await api.functional.discussionBoard.admin.comments.search(connection, {
        body: {
          content_contains: "gamma",
          created_at_from: c.created_at,
        },
      });
    typia.assert(adminSearch);
    const found = adminSearch.data;
    TestValidator.equals("compound filter for gamma/latest comment")(1)(
      found.length,
    );
    TestValidator.equals("compound content for gamma")(
      found[0].content.includes("gamma"),
    )(true);
    TestValidator.equals("compound id for gamma")(found[0].id)(c.id);
  }

  // 9. Negative case - keyword not present yields zero results
  {
    const adminSearch =
      await api.functional.discussionBoard.admin.comments.search(connection, {
        body: {
          content_contains: "NO_MATCH_E2E_UNIQUE_STRING",
        },
      });
    typia.assert(adminSearch);
    TestValidator.equals("empty data for no-match")(adminSearch.data.length)(0);
  }

  // 10. Pagination validation (small n: check limit/records/pages)
  {
    const adminSearch =
      await api.functional.discussionBoard.admin.comments.search(connection, {
        body: {
          // No filter: fetch them all back
        },
      });
    typia.assert(adminSearch);
    const rows = adminSearch.data.filter((row) =>
      comments.some((x) => x.id === row.id),
    );
    TestValidator.equals("pagination returns all test comments")(rows.length)(
      3,
    );
    // Pagination metadata basic structure check
    const meta = adminSearch.pagination;
    TestValidator.predicate("pagination current > 0")(meta.current > 0);
    TestValidator.predicate("pagination limit >= n")(meta.limit >= 3);
    TestValidator.predicate("pagination total records >= n")(meta.records >= 3);
    TestValidator.predicate("pagination pages >= 1")(meta.pages >= 1);
  }
}
