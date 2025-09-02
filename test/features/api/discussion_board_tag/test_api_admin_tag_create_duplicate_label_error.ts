import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test admin tag creation enforces label uniqueness.
 *
 * This test ensures that when an administrator tries to create a tag with a
 * label that has already been used for another tag, the system rejects the
 * attempt with a uniqueness constraint error.
 *
 * Steps:
 *
 * 1. Register an admin to authenticate the session and enable admin
 *    operations.
 * 2. Create the first tag with a deliberately unique label.
 * 3. Attempt to create a second tag with the EXACT same label, but with
 *    different description/active state.
 *
 *    - This should fail due to label uniqueness validation.
 * 4. Confirm that the first creation response is valid and the second attempt
 *    triggers the expected error.
 */
export async function test_api_admin_tag_create_duplicate_label_error(
  connection: api.IConnection,
) {
  // Step 1: Register an admin and authenticate
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // Step 2: Create the initial tag with a unique label
  const duplicateLabel = `test-tag-duplicate-${RandomGenerator.alphaNumeric(8)}`;
  const firstTag = await api.functional.discussionBoard.admin.tags.create(
    connection,
    {
      body: {
        label: duplicateLabel,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        is_active: true,
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(firstTag);
  TestValidator.equals(
    "first tag label matches input label",
    firstTag.label,
    duplicateLabel,
  );

  // Step 3: Attempt to create another tag with the same label (should error)
  await TestValidator.error("should fail on duplicate tag label", async () => {
    await api.functional.discussionBoard.admin.tags.create(connection, {
      body: {
        label: duplicateLabel, // intentionally duplicate
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_active: false,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  });
}
