import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IPageIDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThreads";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates thread search with title filter for a discussion board topic.
 *
 * This test ensures querying threads by a title search param yields only
 * matching threads, verifies pagination and sorting, and excludes irrelevant
 * items.
 *
 * Steps:
 *
 * 1. Choose a random topic (simulate: create uuid for topic ID).
 * 2. Create test threads with controlled titles (some matching search, some not).
 * 3. Search for threads by title substring—verify only correct threads are
 *    returned.
 * 4. Test pagination by requesting small limits and verify correct record
 *    count/page count.
 * 5. Test sorting (asc/desc, different fields).
 * 6. Confirm irrelevant threads are excluded.
 */
export async function test_api_discussionBoard_test_search_threads_with_title_filter(
  connection: api.IConnection,
) {
  // 1. Generate topicId (simulate real topic)
  const topicId = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare test thread titles
  const searchTerm = "DISCOVERY";
  const matchingTitles = [
    `Alpha ${searchTerm} Final`,
    `Pre-${searchTerm} Discussion`,
    `${searchTerm}: Experiment`,
    `Intro to ${searchTerm}`,
  ];
  const nonMatchingTitles = [
    "Completely unrelated thread",
    "Research and Development",
    "General Announcements",
  ];

  // 3. Create all threads (simulate member auth is not needed for this test)
  const allTitles = matchingTitles.concat(nonMatchingTitles);
  for (const title of allTitles) {
    const createThread =
      await api.functional.discussionBoard.member.topics.threads.create(
        connection,
        {
          topicId,
          body: { title },
        },
      );
    typia.assert(createThread);
  }

  // 4. Search by partial title (use case-sensitive match)
  const searchInput: IDiscussionBoardThreads.IRequest = { title: searchTerm };
  const searchResult =
    await api.functional.discussionBoard.topics.threads.search(connection, {
      topicId,
      body: searchInput,
    });
  typia.assert(searchResult);

  // Only threads containing the searchTerm in title should appear
  const foundTitles = searchResult.data.map(
    (th: IDiscussionBoardThreads.ISummary) => th.title,
  );

  for (const t of foundTitles) {
    TestValidator.predicate(`title contains search substring`)(
      t.includes(searchTerm),
    );
  }
  // All matchingTitles should be present
  for (const mt of matchingTitles) {
    TestValidator.predicate(`expected title found`)(foundTitles.includes(mt));
  }
  // No non-matching titles
  for (const nt of nonMatchingTitles) {
    TestValidator.predicate(`non-matching title absent`)(
      !foundTitles.includes(nt),
    );
  }

  // 5. Test pagination
  const pagedResult =
    await api.functional.discussionBoard.topics.threads.search(connection, {
      topicId,
      body: { title: searchTerm, limit: 2, page: 1 },
    });
  typia.assert(pagedResult);
  TestValidator.equals("paginated count")(pagedResult.data.length)(2);
  TestValidator.predicate("valid pagination meta")(
    pagedResult.pagination.limit === 2 &&
      pagedResult.pagination.pages >= 2 &&
      pagedResult.pagination.records === matchingTitles.length,
  );

  // 6. Test sorting
  const ascResult = await api.functional.discussionBoard.topics.threads.search(
    connection,
    {
      topicId,
      body: { title: searchTerm, sort: "title", order: "asc" },
    },
  );
  typia.assert(ascResult);
  const sortedAsc = [...ascResult.data].map(
    (t: IDiscussionBoardThreads.ISummary) => t.title,
  );
  const sortedManual = [...matchingTitles].sort();
  TestValidator.equals("sorted asc")(sortedAsc)(sortedManual);

  const descResult = await api.functional.discussionBoard.topics.threads.search(
    connection,
    {
      topicId,
      body: { title: searchTerm, sort: "title", order: "desc" },
    },
  );
  typia.assert(descResult);
  const sortedDesc = [...descResult.data].map(
    (t: IDiscussionBoardThreads.ISummary) => t.title,
  );
  const manualDesc = [...matchingTitles].sort().reverse();
  TestValidator.equals("sorted desc")(sortedDesc)(manualDesc);
}
