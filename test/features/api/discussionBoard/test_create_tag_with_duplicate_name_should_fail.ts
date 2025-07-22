import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Validates that tag creation enforces name uniqueness and correctly fails on duplicates.
 *
 * This test ensures that the system prevents creating discussion board tags with duplicate names.
 *
 * Steps:
 * 1. Create the first tag with a deterministic name (e.g. 'duplicate-test-<random string>'), verifying success.
 * 2. Attempt to create a second tag with the same name, expecting a conflict or validation error.
 * 3. Confirm that the uniqueness constraint is enforced by checking:
 *    - The first creation returns a valid tag with the exact name used
 *    - The second creation throws an error (caught by TestValidator.error) as expected
 */
export async function test_api_discussionBoard_test_create_tag_with_duplicate_name_should_fail(
  connection: api.IConnection,
) {
  // Generate deterministic test tag name for safe repeatability
  const uniqueTagName = `duplicate-test-${RandomGenerator.alphaNumeric(10)}`;

  // 1. Create the first tag
  const originalTag = await api.functional.discussionBoard.tags.post(connection, {
    body: {
      name: uniqueTagName,
      description: 'This tag is for duplication conflict test.'
    } satisfies IDiscussionBoardTag.ICreate,
  });
  typia.assert(originalTag);
  TestValidator.equals('original tag name')(originalTag.name)(uniqueTagName);

  // 2. Attempt to create a second tag with the same name, expect error
  await TestValidator.error('duplicate tag name should fail')(
    async () => {
      await api.functional.discussionBoard.tags.post(connection, {
        body: {
          name: uniqueTagName,
          description: 'This is a duplicate attempt.'
        } satisfies IDiscussionBoardTag.ICreate,
      });
    }
  );
}