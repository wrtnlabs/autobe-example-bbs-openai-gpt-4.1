import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * Test soft-deletion of a discussion board channel using an invalid or non-existent UUID.
 *
 * Validates that the API properly rejects deletion attempts with malformed or random
 * (non-existent) UUIDs and does not delete or modify any channel in those cases. This
 * guards admin operations and supports robust API safety.
 *
 * Steps:
 * 1. Attempt to soft-delete a channel using a malformed (non-UUID) string as the ID.
 *    - Validate that an error is thrown (e.g., 400 Bad Request).
 * 2. Attempt to soft-delete a channel using a well-formed but non-existent UUID.
 *    - Validate that an error is thrown (e.g., 404 Not Found).
 * 3. As there is no channel index/list API available, deeper verification of unaffected
 *    data is not possible within the current test.
 */
export async function test_api_discussionBoard_test_soft_delete_channel_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Attempt deletion with an INVALID (malformed) UUID
  await TestValidator.error("malformed UUID results in error")(() =>
    api.functional.discussionBoard.channels.eraseById(connection, {
      id: "not-a-uuid" as string & tags.Format<"uuid">,
    })
  );

  // 2. Attempt deletion with a WELL-FORMED but non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent UUID returns not found")(() =>
    api.functional.discussionBoard.channels.eraseById(connection, {
      id: nonExistentId,
    })
  );

  // 3. No verification of actual channels state is possible (list/index API not available)
}