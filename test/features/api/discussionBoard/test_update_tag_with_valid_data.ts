import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test updating a tag's details (such as name or description) with valid, unique data.
 *
 * This test ensures that when a tag exists in the system, an administrator or authorized user
 * can update the name and/or description using the update API. It verifies that the update
 * is successful (according to business and technical rules) and that the returned tag reflects
 * the new data without creating any duplicates or constraint violations.
 *
 * Implementation steps:
 * 1. Create an initial tag with a unique name and (optionally) a description.
 * 2. Update the tag using a new, unique name and/or description.
 * 3. Verify the response of the update call reflects the requested update.
 */
export async function test_api_discussionBoard_test_update_tag_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create an initial tag
  const initialName = `tag_${RandomGenerator.alphaNumeric(8)}`;
  const initialDescription = RandomGenerator.paragraph()();
  const created = await api.functional.discussionBoard.tags.post(connection, {
    body: {
      name: initialName,
      description: initialDescription,
    } satisfies IDiscussionBoardTag.ICreate,
  });
  typia.assert(created);
  TestValidator.equals("created tag name matches")(created.name)(initialName);
  TestValidator.equals("created tag description matches")(created.description)(initialDescription);

  // 2. Update the tag with new, unique data
  const updatedName = `tag_${RandomGenerator.alphaNumeric(10)}`;
  const updatedDescription = RandomGenerator.paragraph()();
  const updated = await api.functional.discussionBoard.tags.putById(connection, {
    id: created.id,
    body: {
      name: updatedName,
      description: updatedDescription,
    } satisfies IDiscussionBoardTag.IUpdate,
  });
  typia.assert(updated);

  // 3. Verify that the update is reflected
  TestValidator.equals("updated tag id matches")(updated.id)(created.id);
  TestValidator.equals("updated tag name matches")(updated.name)(updatedName);
  TestValidator.equals("updated tag description matches")(updated.description)(updatedDescription);
  TestValidator.notEquals("name changed")(updated.name)(created.name);
  TestValidator.notEquals("description changed")(updated.description)(created.description);
}