import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Validate retrieval of discussion board tag details by ID.
 *
 * Ensures that after creating a new tag, retrieving it by its unique ID
 * returns all metadata correctly, and that data matches the creation.
 *
 * Steps:
 * 1. Create a new tag with random but valid name and description.
 * 2. Retrieve the tag by its ID using the GET endpoint.
 * 3. Assert that fields (id, name, description, created_at, updated_at, deleted_at) match creation output or expectation.
 */
export async function test_api_discussionBoard_test_get_tag_details_by_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a tag to get a valid ID
  const tagInput: IDiscussionBoardTag.ICreate = {
    name: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph()(),
  };
  const createdTag: IDiscussionBoardTag = await api.functional.discussionBoard.tags.post(connection, {
    body: tagInput,
  });
  typia.assert(createdTag);

  // 2. Retrieve the tag by ID
  const fetchedTag: IDiscussionBoardTag = await api.functional.discussionBoard.tags.getById(connection, {
    id: createdTag.id,
  });
  typia.assert(fetchedTag);

  // 3. Assert that the fetched tag matches what was created
  TestValidator.equals("tag id")(fetchedTag.id)(createdTag.id);
  TestValidator.equals("tag name")(fetchedTag.name)(createdTag.name);
  TestValidator.equals("tag description")(fetchedTag.description ?? null)(createdTag.description ?? null);
  TestValidator.equals("created_at")(fetchedTag.created_at)(createdTag.created_at);
  TestValidator.equals("updated_at")(fetchedTag.updated_at)(createdTag.updated_at);
  // Newly created tags should have deleted_at as null or undefined (interpreted as null)
  TestValidator.equals("deleted_at")(fetchedTag.deleted_at ?? null)(null);
}