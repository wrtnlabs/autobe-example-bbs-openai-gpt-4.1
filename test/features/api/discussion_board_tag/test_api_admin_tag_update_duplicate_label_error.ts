import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Validate uniqueness constraint on tag labels during update (duplicate
 * label should fail).
 *
 * This test ensures that the discussion board API correctly enforces label
 * uniqueness for tags. It checks that attempting to update one tag's label
 * to an existing label of another tag fails with a meaningful validation
 * error.
 *
 * 1. Register as admin via POST /auth/admin/join to obtain admin credentials.
 * 2. Create a tag (tag1) with a generated unique label (label1).
 * 3. Create a second tag (tag2) with a different unique label (label2).
 * 4. Attempt to update tag2 by setting its label to label1 (duplicate label).
 * 5. Validate that the update operation fails with a descriptive error,
 *    confirming the uniqueness constraint is enforced.
 *
 * Business context: Platform admins must not be able to create or update
 * tags such that two tags share the same label. This test ensures the
 * backend properly prevents this data integrity violation and provides
 * correct feedback.
 */
export async function test_api_admin_tag_update_duplicate_label_error(
  connection: api.IConnection,
) {
  // 1. Register as admin
  const adminUserId: string = typia.random<string & tags.Format<"uuid">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create first tag (tag1) with unique label1
  const label1 =
    RandomGenerator.name(1) + "_" + RandomGenerator.alphaNumeric(5);
  const tag1 = await api.functional.discussionBoard.admin.tags.create(
    connection,
    {
      body: {
        label: label1,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_active: true,
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag1);

  // 3. Create second tag (tag2) with distinct label2
  let label2 = RandomGenerator.name(1) + "_" + RandomGenerator.alphaNumeric(5);
  while (label2 === label1) {
    label2 = RandomGenerator.name(1) + "_" + RandomGenerator.alphaNumeric(5);
  }
  const tag2 = await api.functional.discussionBoard.admin.tags.create(
    connection,
    {
      body: {
        label: label2,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_active: true,
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag2);

  // 4. Attempt to update tag2's label to that of tag1 (should fail)
  await TestValidator.error(
    "updating tag label to a duplicate value must fail",
    async () => {
      await api.functional.discussionBoard.admin.tags.update(connection, {
        tagId: tag2.id,
        body: { label: label1 } satisfies IDiscussionBoardTag.IUpdate,
      });
    },
  );
}
