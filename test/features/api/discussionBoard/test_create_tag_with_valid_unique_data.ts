import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the creation of a new discussion board tag with a unique name and valid description.
 *
 * This test ensures that when a unique and valid tag name with description is submitted:
 * 1. The tag is created successfully.
 * 2. The API response returns all required metadata fields with correct values.
 *
 * Steps:
 * 1. Generate a unique tag name using a random alphanumeric string.
 * 2. POST to /discussionBoard/tags with this name and a valid description.
 * 3. Assert the API returns an IDiscussionBoardTag with matching name and description, and valid metadata formats (uuid id, ISO timestamps).
 */
export async function test_api_discussionBoard_test_create_tag_with_valid_unique_data(
  connection: api.IConnection,
) {
  // 1. Prepare a unique tag name and valid description
  const tagName = `test-tag-unique-${RandomGenerator.alphaNumeric(8)}`;
  const tagDescription = "Discussion board test tag description.";

  // 2. Create the tag via the API
  const createdTag = await api.functional.discussionBoard.tags.post(connection, {
    body: {
      name: tagName,
      description: tagDescription,
    } satisfies IDiscussionBoardTag.ICreate,
  });
  typia.assert(createdTag);

  // 3. Validation: Check returned values and formats
  TestValidator.equals("tag name")(createdTag.name)(tagName);
  TestValidator.equals("tag description")(createdTag.description)(tagDescription);
  TestValidator.predicate("id is valid uuid")(
    typeof createdTag.id === "string" &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(createdTag.id),
  );
  TestValidator.predicate("created_at is ISO 8601")(
    typeof createdTag.created_at === "string" && !Number.isNaN(Date.parse(createdTag.created_at)),
  );
  TestValidator.predicate("updated_at is ISO 8601")(
    typeof createdTag.updated_at === "string" && !Number.isNaN(Date.parse(createdTag.updated_at)),
  );
}