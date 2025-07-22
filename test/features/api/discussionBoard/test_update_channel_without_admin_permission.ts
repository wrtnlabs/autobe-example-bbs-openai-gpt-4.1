import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * Test RBAC enforcement: try updating a discussion board channel without admin privileges.
 *
 * Ensures that non-administrators (including unauthenticated users) cannot update discussion board channels.
 *
 * 1. Create a channel as admin (set up dependency)
 * 2. Simulate a non-admin user by removing Authorization from the connection (or otherwise clearing privileges)
 * 3. Attempt to update the channel
 * 4. Assert that forbidden or unauthorized error is thrown (enforcing RBAC)
 */
export async function test_api_discussionBoard_test_update_channel_without_admin_permission(
  connection: api.IConnection,
) {
  // 1. Create a channel as administrator for test target setup
  const initialChannel = await api.functional.discussionBoard.channels.post(connection, {
    body: {
      code: RandomGenerator.alphabets(5),
      name: RandomGenerator.alphabets(8),
      description: RandomGenerator.paragraph()()
    } satisfies IDiscussionBoardChannel.ICreate,
  });
  typia.assert(initialChannel);

  // 2. Simulate a non-admin/unauthenticated user by removing Authorization header
  //    (Assumes RBAC is enforced via this mechanism in test environment)
  const nonAdminConnection = { ...connection, headers: { ...connection.headers } };
  delete nonAdminConnection.headers.Authorization;

  // 3. Attempt to update the channel without admin privilege
  await TestValidator.error("forbidden or unauthorized error when updating channel without admin")(
    async () => {
      await api.functional.discussionBoard.channels.putById(nonAdminConnection, {
        id: initialChannel.id,
        body: {
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph()(),
        } satisfies IDiscussionBoardChannel.IUpdate,
      });
    },
  );
}