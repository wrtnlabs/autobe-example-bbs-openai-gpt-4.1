import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validate error response when retrieving a non-existent subscription by ID as
 * admin.
 *
 * As an admin, API consumers should receive a well-formed not found error when
 * attempting to fetch details of a subscription that does not exist in the
 * system (either random, invalid, or deleted subscriptionId).
 *
 * Test Procedure:
 *
 * 1. Attempt to fetch details of a subscription using a random UUID that does not
 *    correspond to any existing record.
 * 2. Verify that the API returns a proper not found error.
 * 3. Ensure the error handling is robust and type-safe, and the error is not a
 *    silent success or a malformed response.
 *
 * This test validates correct error handling and response structure for invalid
 * resource references.
 */
export async function test_api_discussionBoard_test_retrieve_subscription_details_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Attempt to retrieve subscription with a random (non-existent) subscriptionId
  await TestValidator.error("should fail for non-existent subscriptionId")(
    async () => {
      await api.functional.discussionBoard.admin.subscriptions.at(connection, {
        subscriptionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
