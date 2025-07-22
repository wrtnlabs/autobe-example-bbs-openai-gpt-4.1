import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * Test updating a channel's details as an administrator.
 *
 * This test verifies that an admin can update a discussion board channel's code, name, and description,
 * and that all business logic and audit trail requirements are correctly enforced.
 *
 * Workflow:
 * 1. Create a new discussion board channel to obtain a valid channel id.
 * 2. Update the channel with new, unique code, name, and description using the update endpoint.
 * 3. Assert that all updated fields are reflected in the response.
 * 4. Check that the updated_at audit timestamp is incremented.
 * 5. Verify that the channel remains not deleted (deleted_at is still null).
 * 6. Assert that the id is unchanged after the update.
 * 7. Ensure that code uniqueness is respected by generating a new, random code for the update.
 */
export async function test_api_discussionBoard_channels_test_update_channel_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a new channel for update
  const originalChannel = await api.functional.discussionBoard.channels.post(connection, {
    body: {
      code: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.alphabets(12),
      description: "Original channel for update.",
    } satisfies IDiscussionBoardChannel.ICreate,
  });
  typia.assert(originalChannel);

  // 2. Prepare updated data with a new unique code and name
  const updatedCode = RandomGenerator.alphaNumeric(10);
  const updatedName = RandomGenerator.alphabets(14);
  const updatedDescription = "Updated channel details.";

  // 3. Update the channel
  const updatedChannel = await api.functional.discussionBoard.channels.putById(connection, {
    id: originalChannel.id,
    body: {
      code: updatedCode,
      name: updatedName,
      description: updatedDescription,
    } satisfies IDiscussionBoardChannel.IUpdate,
  });
  typia.assert(updatedChannel);

  // 4. Validate updated fields
  TestValidator.equals("channel code updated")(updatedChannel.code)(updatedCode);
  TestValidator.equals("channel name updated")(updatedChannel.name)(updatedName);
  TestValidator.equals("channel description updated")(updatedChannel.description)(updatedDescription);

  // 5. Audit: Confirm updated_at timestamp reflects the update
  TestValidator.predicate("updated_at is newer after update")(
    new Date(updatedChannel.updated_at).getTime() > new Date(originalChannel.updated_at).getTime(),
  );

  // 6. Channel must not be soft-deleted
  TestValidator.equals("channel not soft-deleted")(updatedChannel.deleted_at)(null);

  // 7. Channel id must remain unchanged
  TestValidator.equals("channel ID unchanged")(updatedChannel.id)(originalChannel.id);
}