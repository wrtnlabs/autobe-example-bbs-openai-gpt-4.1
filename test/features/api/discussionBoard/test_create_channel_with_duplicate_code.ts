import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * Test channel code uniqueness enforcement in discussion board API.
 *
 * This test ensures that attempting to create a discussion board channel with a duplicate `code`
 * results in a validation or conflict error as required by business rules.
 *
 * Step-by-step process:
 * 1. Create an initial channel with a specific code (setup dependency)
 * 2. Attempt to create a second channel using the same exact code value, but a different name/description
 * 3. Verify that an error occurs and no duplicate channel is created
 */
export async function test_api_discussionBoard_test_create_channel_with_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Create initial channel as setup (establish code)
  const code: string = RandomGenerator.alphaNumeric(8);
  const channel1 = await api.functional.discussionBoard.channels.post(connection, {
    body: {
      code,
      name: "Economics",
      description: "Economics forum channel."
    } satisfies IDiscussionBoardChannel.ICreate,
  });
  typia.assert(channel1);

  // 2. Attempt to create a second channel with the same code
  await TestValidator.error("duplicate code should not be allowed")(async () => {
    await api.functional.discussionBoard.channels.post(connection, {
      body: {
        code,
        name: "Economics Duplicate",
        description: "Attempt to use duplicate code for channel creation."
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  });
}