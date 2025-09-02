import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test updating a discussion board tag using a non-existent tagId.
 *
 * 1. Register and authenticate as admin using /auth/admin/join (to obtain
 *    proper Authorization context for admin-only endpoints).
 * 2. Attempt to update a tag using PUT /discussionBoard/admin/tags/{tagId},
 *    where tagId is randomly generated and does not correspond to an
 *    existing record.
 * 3. Use random but valid update data in the request body.
 * 4. Validate that the system responds with a not-found error and does not
 *    update anything (error must be thrown). No check for database mutation
 *    is performed because no tag with the specified id exists.
 * 5. No further steps (such as fetching the tag) are necessary as the scenario
 *    is strictly about correct error handling for nonexistent entities.
 */
export async function test_api_admin_tag_update_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Register an admin account and get authenticated (Authorization header set)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Attempt to update a non-existent tag; expect not-found error
  await TestValidator.error(
    "updating non-existent tag throws not-found error",
    async () => {
      await api.functional.discussionBoard.admin.tags.update(connection, {
        tagId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          label: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
        } satisfies IDiscussionBoardTag.IUpdate,
      });
    },
  );
}
