import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_thread_post_list_pagination_and_filters(
  connection: api.IConnection,
) {
  // Generate or select a threadId
  const threadId = typia.random<string & tags.Format<"uuid">>();

  // 1. Basic pagination: page 1, limit 5
  const respPage1 = await api.functional.discussionBoard.threads.posts.index(
    connection,
    {
      threadId,
      body: { page: 1, limit: 5 } satisfies IDiscussionBoardPost.IRequest,
    },
  );
  typia.assert(respPage1);
  TestValidator.equals(
    "pagination current page 1",
    respPage1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 5", respPage1.pagination.limit, 5);
  TestValidator.predicate("data length <= limit", respPage1.data.length <= 5);

  // 2. Retrieve page 2 with same limit
  const respPage2 = await api.functional.discussionBoard.threads.posts.index(
    connection,
    {
      threadId,
      body: { page: 2, limit: 5 } satisfies IDiscussionBoardPost.IRequest,
    },
  );
  typia.assert(respPage2);
  TestValidator.equals(
    "pagination current page 2",
    respPage2.pagination.current,
    2,
  );

  // 3. Search by keyword in title/body
  if (respPage1.data.length > 0) {
    const basePost = respPage1.data[0];
    const keyword = RandomGenerator.substring(basePost.title);
    const respSearch = await api.functional.discussionBoard.threads.posts.index(
      connection,
      {
        threadId,
        body: { search: keyword } satisfies IDiscussionBoardPost.IRequest,
      },
    );
    typia.assert(respSearch);
    TestValidator.predicate(
      `all search results contain keyword '${keyword}' in title or (if possible) in body`,
      respSearch.data.every((post) => post.title.includes(keyword)),
    );
  }

  // 4. Filter by author
  if (respPage1.data.length > 0) {
    const createdById = respPage1.data[0].created_by_id;
    const respAuthor = await api.functional.discussionBoard.threads.posts.index(
      connection,
      {
        threadId,
        body: {
          created_by_id: createdById,
        } satisfies IDiscussionBoardPost.IRequest,
      },
    );
    typia.assert(respAuthor);
    TestValidator.predicate(
      "all results are by expected author",
      respAuthor.data.every((post) => post.created_by_id === createdById),
    );
  }

  // 5. Filter by creation date range
  if (respPage1.data.length > 0) {
    const created_at = respPage1.data[0].created_at;
    const respDate = await api.functional.discussionBoard.threads.posts.index(
      connection,
      {
        threadId,
        body: {
          created_from: created_at,
          created_to: created_at,
        } satisfies IDiscussionBoardPost.IRequest,
      },
    );
    typia.assert(respDate);
    TestValidator.predicate(
      "all results created_at match filter date",
      respDate.data.every((post) => post.created_at === created_at),
    );
  }

  // 6. Sorting tests ascending/descending
  const sortPairs = [
    ["created_at", "asc"],
    ["created_at", "desc"],
    ["title", "asc"],
    ["title", "desc"],
  ] as const;
  for (const [orderBy, orderDirection] of sortPairs) {
    const respSort = await api.functional.discussionBoard.threads.posts.index(
      connection,
      {
        threadId,
        body: {
          orderBy,
          orderDirection,
        } satisfies IDiscussionBoardPost.IRequest,
      },
    );
    typia.assert(respSort);
    if (respSort.data.length >= 2) {
      for (let i = 1; i < respSort.data.length; ++i) {
        const prev = respSort.data[i - 1];
        const curr = respSort.data[i];
        if (orderBy === "title") {
          if (orderDirection === "asc")
            TestValidator.predicate(
              `title ascending order [${i}]`,
              prev.title <= curr.title,
            );
          else
            TestValidator.predicate(
              `title descending order [${i}]`,
              prev.title >= curr.title,
            );
        } else if (orderBy === "created_at") {
          if (orderDirection === "asc")
            TestValidator.predicate(
              `created_at ascending order [${i}]`,
              prev.created_at <= curr.created_at,
            );
          else
            TestValidator.predicate(
              `created_at descending order [${i}]`,
              prev.created_at >= curr.created_at,
            );
        }
      }
    }
  }

  // 7. Error when threadId does not exist
  await TestValidator.error("non-existent threadId returns error", async () => {
    await api.functional.discussionBoard.threads.posts.index(connection, {
      threadId: typia.random<string & tags.Format<"uuid">>(),
      body: { page: 1 } satisfies IDiscussionBoardPost.IRequest,
    });
  });
}
