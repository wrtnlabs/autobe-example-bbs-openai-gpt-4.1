import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * Verify RBAC enforcement for channel creation (non-admin forbidden).
 *
 * This test checks that ordinary users (without admin privilege) cannot create top-level discussion board channels.
 * The API operation /discussionBoard/channels is strictly restricted to admin role as per business RBAC policy.
 *
 * 1. Prepare a regular user connection (assume the provided connection does not carry admin privileges).
 * 2. Attempt to call the channel creation endpoint with a valid random request body.
 * 3. Confirm that the API call fails with HTTP 401 Unauthorized or 403 Forbidden (TestValidator.error).
 * 4. Ensure no discussion board channel is created if permission is properly enforced.
 */
export async function test_api_discussionBoard_test_create_channel_without_admin_permission(
  connection: api.IConnection,
) {
  // 1. Prepare a channel creation request body
  const requestBody: IDiscussionBoardChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph()(),
  };

  // 2. Attempt to create channel as a non-admin user, expect forbidden/unauthorized error
  await TestValidator.error("forbid channel creation without admin")(
    async () => {
      await api.functional.discussionBoard.channels.post(connection, {
        body: requestBody,
      });
    },
  );
}