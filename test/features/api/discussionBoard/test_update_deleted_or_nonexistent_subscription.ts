import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validates that attempting to update a subscription that has either been deleted or never existed returns the correct error.
 *
 * This test ensures the API enforces not found or gone error semantics and does not leak or inadvertently create new subscription data when bad IDs are provided.
 *
 * Steps:
 * 1. Register a new member to obtain a valid user context.
 * 2. Attempt to update a subscription using a random UUID (which does not exist). Assert an error is returned (not found/gone).
 * 3. (Optional for real systems) If there were a subscription-creation and deletion API, create, delete, then try update and assert correct error. But due to missing endpoints, only the non-existent case is implemented here.
 */
export async function test_api_discussionBoard_test_update_deleted_or_nonexistent_subscription(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Try to update a non-existent subscription (random UUID, surely not in DB)
  await TestValidator.error("updating non-existent subscription should fail")(
    async () => {
      await api.functional.discussionBoard.subscriptions.putById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies IDiscussionBoardSubscription.IUpdate,
      });
    },
  );
}