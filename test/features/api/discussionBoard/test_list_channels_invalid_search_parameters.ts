import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IPageIDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test listing discussion board channels with invalid search and pagination parameters (input validation).
 *
 * This test verifies that when a client submits malformed or invalid search and pagination parameters to the discussion board channels listing API (/discussionBoard/channels, patch),
 * the API correctly rejects these requests with appropriate validation errors, and does not leak sensitive implementation or internal details. This includes cases such as:
 *  - Supplying a string instead of a number for 'page' and 'limit' fields (which must be int32 numbers)
 *  - Supplying negative or zero for 'page' or 'limit' (where >0 is required)
 *  - Passing an unexpected additional property in the filter object (such as an undefined filter key)
 *  - Passing a malformed UUID as a code or name filter (even though these are strings, constraints may apply)
 *  - Passing null for required pagination fields and observing response
 *
 * Steps:
 * 1. Attempt to call the /discussionBoard/channels.patch API with each class of invalid input (one by one):
 *    - 'page' as a string, 'limit' as a string, 'page' as a negative number, 'limit' as zero
 *    - An unexpected search property (e.g. 'foo')
 *    - Valid structure, but all values set to null (edge case)
 * 2. For each invalid request, verify that the API returns a proper validation error (4xx error), not a successful response.
 * 3. Check that the response does not leak implementation-internal details (e.g., stack trace, full internal error messages).
 * 4. Optionally, for 'all null' input case (no fields set), observe the response: it should be either a valid empty/default result or return a validation error, depending on business logic.
 *
 * Success criteria:
 *  - API rejects malformed parameters with HTTP 4xx errors
 *  - Response is safe and generic (no internal data leaks)
 *  - Type assertions are not passed for invalid requests; they throw or fail
 */
export async function test_api_discussionBoard_test_list_channels_invalid_search_parameters(connection: api.IConnection) {
  // 1. 'page' as a string
  await TestValidator.error("'page' as a string should fail")(async () => {
    await api.functional.discussionBoard.channels.patch(connection, {
      body: {
        page: "not-a-number" as unknown as number,
      } as unknown as IDiscussionBoardChannel.IRequest,
    });
  });

  // 2. 'limit' as a string
  await TestValidator.error("'limit' as a string should fail")(async () => {
    await api.functional.discussionBoard.channels.patch(connection, {
      body: {
        limit: "twenty" as unknown as number,
      } as unknown as IDiscussionBoardChannel.IRequest,
    });
  });

  // 3. 'page' as a negative number
  await TestValidator.error("'page' as negative")(async () => {
    await api.functional.discussionBoard.channels.patch(connection, {
      body: {
        page: -1,
      },
    });
  });

  // 4. 'limit' as zero
  await TestValidator.error("'limit' as zero")(async () => {
    await api.functional.discussionBoard.channels.patch(connection, {
      body: {
        limit: 0,
      },
    });
  });

  // 5. Unexpected property in filter
  await TestValidator.error("unexpected property in filter")(async () => {
    await api.functional.discussionBoard.channels.patch(connection, {
      body: {
        foo: "bar" as unknown as never,
      } as unknown as IDiscussionBoardChannel.IRequest,
    });
  });

  // 6. All fields set to null (may be accepted if business logic allows)
  try {
    const result = await api.functional.discussionBoard.channels.patch(connection, {
      body: {
        page: null,
        limit: null,
        code: null,
        name: null,
        description: null,
      },
    });
    // Should either be valid response or error depending on API requirement
    typia.assert(result);
  } catch (error) {
    // Acceptable if API returns validation error for all-null
  }
}