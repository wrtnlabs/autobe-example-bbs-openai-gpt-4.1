import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * Test updating a discussion board channel with a non-existent or malformed UUID, ensuring failure.
 *
 * Business context:
 * This test attempts to update a discussion board channel using two types of invalid IDs: a malformed UUID and a well-formed but non-existent UUID. It verifies the API's robustness by ensuring that invalid identifiers do not allow updates, thus protecting against accidental resource modification or information leakage. Enforcement of correct error behavior for bad identifiers is critical for API security and integrity.
 *
 * Step-by-step process:
 * 1. Attempt to update a channel with a malformed UUID and confirm the API rejects the request.
 * 2. Attempt to update a channel with a well-formed but non-existent UUID and confirm the API returns a not found error.
 */
export async function test_api_discussionBoard_test_update_channel_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Attempt update with a malformed UUID (e.g., not UUID format)
  await TestValidator.error("malformed UUID should be rejected")(() =>
    api.functional.discussionBoard.channels.putById(connection, {
      id: "invalid-uuid" as string & tags.Format<"uuid">,
      body: {
        code: "fake-code",
        name: "Fake Name",
        description: "This should not update any resource.",
      } satisfies IDiscussionBoardChannel.IUpdate,
    })
  );

  // 2. Attempt update with a well-formed but non-existent UUID (should return not found)
  const unusedUuid = "00000000-0000-4000-8000-000000000000" as string & tags.Format<"uuid">;
  await TestValidator.error("non-existent UUID should return not found")(() =>
    api.functional.discussionBoard.channels.putById(connection, {
      id: unusedUuid,
      body: {
        code: "ghost-channel",
        name: "Ghost Channel",
        description: "Updating with non-existent ID must fail.",
      } satisfies IDiscussionBoardChannel.IUpdate,
    })
  );
}