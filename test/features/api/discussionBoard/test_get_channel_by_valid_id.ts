import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * Validate retrieval of a specific discussion board channel by UUID (GET /discussionBoard/channels/{id}).
 *
 * This test ensures that the API can accurately retrieve all persisted metadata for a specific channel.
 * It covers:
 * 1. Creation of a new channel (as dependency)
 * 2. Retrieval of the newly-created channel via its UUID
 * 3. Field-by-field validation: id, code, name, description, created/updated/deleted timestamps
 * 4. Public/visitor access (no authentication required for channel retrieval)
 *
 * Rationale: Accurate retrieval is critical for forum navigation and admin UI. The test guarantees that both atomic fields and audit fields are correctly stored and retrievable.
 */
export async function test_api_discussionBoard_channels_getById(
  connection: api.IConnection,
) {
  // 1. Create a new channel to get a valid UUID for test
  const createInput: IDiscussionBoardChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph()(),
  };
  const created: IDiscussionBoardChannel = await api.functional.discussionBoard.channels.post(connection, {
    body: createInput,
  });
  typia.assert(created);

  // 2. Retrieve channel by id
  const retrieved: IDiscussionBoardChannel = await api.functional.discussionBoard.channels.getById(connection, {
    id: created.id,
  });
  typia.assert(retrieved);

  // 3. Validate field correctness and persistence
  TestValidator.equals("channel.id matches")(retrieved.id)(created.id);
  TestValidator.equals("channel.code matches")(retrieved.code)(createInput.code);
  TestValidator.equals("channel.name matches")(retrieved.name)(createInput.name);
  TestValidator.equals("channel.description matches")(
    // null/undefined may resolve as null on server even if absent in input
    retrieved.description ?? null
  )(createInput.description ?? null);
  // Audit fields: created_at/updated_at must be valid ISO strings
  TestValidator.predicate("created_at is ISO 8601 string")(
    typeof retrieved.created_at === "string" && !isNaN(Date.parse(retrieved.created_at))
  );
  TestValidator.predicate("updated_at is ISO 8601 string")(
    typeof retrieved.updated_at === "string" && !isNaN(Date.parse(retrieved.updated_at))
  );
  // deleted_at must be null or undefined for brand new channels
  TestValidator.equals("channel not deleted")(retrieved.deleted_at ?? null)(null);
}