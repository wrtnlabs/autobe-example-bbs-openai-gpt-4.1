import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * Test the soft-deletion of a discussion board channel by an administrator.
 *
 * This test ensures the following:
 * 1. A channel can be created and its initial state is active (deleted_at is null or absent).
 * 2. The administrator can soft-delete the channel using the delete endpoint.
 * 3. After soft-deletion, the channel's deleted_at field is populated with a timestamp.
 * 4. (If applicable) The deleted channel is no longer available via standard retrieval APIs (not testable here due to absence of list/get).
 * 5. (Non-implementable) Audit logs and reversibility are out of scope as corresponding endpoints are not available.
 *
 * Steps:
 * 1. Create a discussion board channel via the admin endpoint.
 * 2. Delete the created channel using its id.
 * 3. Assert that deleted_at is now a valid timestamp and other required fields remain unchanged or as expected.
 * 4. (If APIs existed) Attempt to retrieve the channel and expect it to be missing from listings, but retrieval is not possible with provided SDK.
 */
export async function test_api_discussionBoard_test_soft_delete_channel_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a new discussion board channel
  const channelInput: IDiscussionBoardChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: `Test Channel ${RandomGenerator.alphaNumeric(5)}`,
    description: RandomGenerator.paragraph()(),
  };
  const createdChannel = await api.functional.discussionBoard.channels.post(
    connection,
    {
      body: channelInput,
    },
  );
  typia.assert(createdChannel);
  TestValidator.equals("channel not deleted at creation")(createdChannel.deleted_at)(null);

  // 2. Soft-delete the created channel as admin
  const deletedChannel = await api.functional.discussionBoard.channels.eraseById(
    connection,
    {
      id: createdChannel.id,
    },
  );
  typia.assert(deletedChannel);

  // 3. Validate the 'deleted_at' field is now set
  TestValidator.predicate("deleted_at is populated")(
    typeof deletedChannel.deleted_at === "string" && deletedChannel.deleted_at !== null,
  );

  // 4. (Non-implementable) Try to list or get the channel to confirm it's gone (API not provided)
  // 5. (Non-implementable) Validate audit or reversible deletion (API not provided)
}