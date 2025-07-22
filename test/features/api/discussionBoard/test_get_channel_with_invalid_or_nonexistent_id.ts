import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * Test retrieving a discussion board channel with invalid or non-existent IDs.
 *
 * This test verifies that the API correctly handles requests for channels using:
 * 1. Malformed UUIDs (invalid format)
 * 2. Well-formed but non-existent UUIDs
 *
 * The API should return a 404 Not Found (or a relevant error for malformed UUID), and must not leak any sensitive or internal information in error responses.
 *
 * Steps:
 * 1. Attempt retrieval using a clearly malformed UUID (not matching format) and expect an error.
 * 2. Attempt retrieval using a valid-format but random non-existent UUID and expect a not found error.
 * 3. For each error, ensure no sensitive backend info is leaked in the error response body (cannot assert error message; just check that error is thrown).
 *
 * Note: Testing soft-deleted IDs requires create/delete APIs which are not available, so this is omitted.
 */
export async function test_api_discussionBoard_test_get_channel_with_invalid_or_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Malformed UUID (should result in a validation error or 404, depending on backend)
  await TestValidator.error("Malformed UUID should cause error")(
    async () => {
      await api.functional.discussionBoard.channels.getById(connection, {
        id: "not-a-uuid" as string & tags.Format<"uuid">,
      });
    },
  );

  // 2. Well-formed but non-existent UUID (should result in a not found error)
  await TestValidator.error("Non-existent channel returns error")(
    async () => {
      await api.functional.discussionBoard.channels.getById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 3. Not possible to test soft-deleted IDs directly (no such API available)
}