import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Validate error handling when trying to create a discussion board tag with invalid input data.
 *
 * Ensures that attempts to create a tag with invalid `name` data are rejected according to business and validation rules.
 *
 * Steps:
 * 1. Attempt creation with missing required `name` field (should fail validation).
 * 2. Attempt creation with an empty string as `name` (should fail business/content validation).
 * 3. Attempt creation with a `name` that far exceeds probable limits (simulate max length validation failure).
 * 4. Attempt creation with a `name` field of only whitespace (should fail business/content validation).
 * 5. Assert the API returns errors in each case and does not create the tag.
 */
export async function test_api_discussionBoard_test_create_tag_with_invalid_input_data(
  connection: api.IConnection,
) {
  // 1. Missing required 'name' field
  await TestValidator.error("should fail creation when 'name' is missing")(
    async () => {
      // This fails at TypeScript level, so we use 'as any' for runtime test
      await api.functional.discussionBoard.tags.post(connection, {
        body: {} as any, // Intentionally missing 'name' for negative test case
      });
    },
  );

  // 2. Name is empty string
  await TestValidator.error("should fail creation when name is empty string")(
    async () => {
      await api.functional.discussionBoard.tags.post(connection, {
        body: { name: "", description: "Blank name test" },
      });
    },
  );

  // 3. Name is excessively long (simulate max length violation, e.g., 255+ chars)
  await TestValidator.error("should fail creation when name is too long")(
    async () => {
      const longName = Array(300).fill("a").join("");
      await api.functional.discussionBoard.tags.post(connection, {
        body: { name: longName, description: "Name too long test" },
      });
    },
  );

  // 4. Name is only whitespace
  await TestValidator.error("should fail creation when name is only spaces")(
    async () => {
      await api.functional.discussionBoard.tags.post(connection, {
        body: { name: "     ", description: "Name only spaces test" },
      });
    },
  );
}