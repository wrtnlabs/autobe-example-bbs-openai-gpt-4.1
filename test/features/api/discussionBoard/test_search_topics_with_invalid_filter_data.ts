import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IPageIDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopics";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that the discussion board topic search API correctly rejects
 * requests with invalid filter data.
 *
 * This test sends malformed search/filter payloads, such as:
 *
 * - Category_id: string that is not a UUID
 * - Pinned: non-boolean value
 * - Closed: non-boolean value
 * - Created_from/created_to: invalid date format
 * - Sort/order: unsupported enum value
 * - Unsupported/extra fields
 *
 * For each case:
 *
 * 1. Attempt the search with the invalid filter.
 * 2. Verify a validation error is thrown (TestValidator.error).
 * 3. Confirm the API does not return any valid search output (test is only for
 *    validation logic).
 */
export async function test_api_discussionBoard_test_search_topics_with_invalid_filter_data(
  connection: api.IConnection,
) {
  // 1. Invalid category_id (not a UUID string)
  await TestValidator.error("invalid category_id")(() =>
    api.functional.discussionBoard.topics.search(connection, {
      body: {
        category_id: "not-a-uuid" as any,
      },
    }),
  );

  // 2. Invalid pinned (string instead of boolean)
  await TestValidator.error("invalid pinned type")(() =>
    api.functional.discussionBoard.topics.search(connection, {
      body: {
        pinned: "yes" as any,
      },
    }),
  );

  // 3. Invalid closed (number instead of boolean)
  await TestValidator.error("invalid closed type")(() =>
    api.functional.discussionBoard.topics.search(connection, {
      body: {
        closed: 123 as any,
      },
    }),
  );

  // 4. Invalid created_from (bad date format)
  await TestValidator.error("invalid created_from")(() =>
    api.functional.discussionBoard.topics.search(connection, {
      body: {
        created_from: "31-12-2022-12:00:00" as any,
      },
    }),
  );

  // 5. Invalid created_to (bad date format)
  await TestValidator.error("invalid created_to")(() =>
    api.functional.discussionBoard.topics.search(connection, {
      body: {
        created_to: "yesterday" as any,
      },
    }),
  );

  // 6. Invalid sort field
  await TestValidator.error("invalid sort field")(() =>
    api.functional.discussionBoard.topics.search(connection, {
      body: {
        sort: "invalid-field" as any,
      },
    }),
  );

  // 7. Invalid order field
  await TestValidator.error("invalid order field")(() =>
    api.functional.discussionBoard.topics.search(connection, {
      body: {
        order: "upward" as any,
      },
    }),
  );

  // 8. Unsupported extra fields (should trigger validation failure)
  await TestValidator.error("unsupported extra fields")(() =>
    api.functional.discussionBoard.topics.search(connection, {
      body: {
        foo: "bar" as any,
      } as any,
    }),
  );
}
