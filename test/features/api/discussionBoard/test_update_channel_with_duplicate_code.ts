import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * Test updating a discussion board channel with a duplicate code.
 *
 * Validates that updating a channel's code to a value already used by another channel is rejected by the API: a uniqueness constraint violation should occur, and no changes should be saved. This ensures the endpoint enforces business constraints for forum channel code management.
 *
 * **Test Steps:**
 * 1. Create the original channel (channel1) with a unique code.
 * 2. Create a second channel (channel2) with a different code.
 * 3. Attempt to update channel2, setting its code to that of channel1.
 * 4. Ensure a validation error occurs due to the duplicate code (no details about the error payload checked, only that an error is thrown).
 * 5. (If GET API existed, would re-check that both channels remain unchanged; omitted per current SDK constraints.)
 */
export async function test_api_discussionBoard_test_update_channel_with_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Create the original channel (channel1) with a unique code
  const code1 = `eco-${RandomGenerator.alphaNumeric(6)}`;
  const name1 = `Economics ${RandomGenerator.alphaNumeric(4)}`;
  const description1 = "Economics topics";
  const channel1 = await api.functional.discussionBoard.channels.post(connection, {
    body: { code: code1, name: name1, description: description1 } satisfies IDiscussionBoardChannel.ICreate,
  });
  typia.assert(channel1);

  // 2. Create a second channel (channel2) with a different code
  const code2 = `law-${RandomGenerator.alphaNumeric(6)}`;
  const name2 = `Legislation ${RandomGenerator.alphaNumeric(4)}`;
  const description2 = "Laws and regulations";
  const channel2 = await api.functional.discussionBoard.channels.post(connection, {
    body: { code: code2, name: name2, description: description2 } satisfies IDiscussionBoardChannel.ICreate,
  });
  typia.assert(channel2);

  // 3. Attempt to update channel2's code to channel1's code
  await TestValidator.error("Duplicate code should be rejected")(async () => {
    await api.functional.discussionBoard.channels.putById(connection, {
      id: channel2.id,
      body: { code: code1, name: name2, description: description2 } satisfies IDiscussionBoardChannel.IUpdate,
    });
  });

  // 4. (Skipped) Would verify channels remain unchanged if GET API were available.
}