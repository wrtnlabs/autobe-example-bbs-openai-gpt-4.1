import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Validate that a non-admin, non-moderator user (ordinary member) cannot delete
 * a content flag.
 *
 * This test simulates a scenario where:
 *
 * 1. An admin creates a content flag for a post or comment (setup).
 * 2. The user switches to a non-privileged ordinary member account.
 * 3. The member attempts to delete the content flag using the admin-only endpoint.
 * 4. The API should respond with a forbidden error, and the flag must remain
 *    present.
 *
 * Steps:
 *
 * 1. As admin: create a new content flag (targeting a post or comment).
 * 2. Simulate ordinary member session by removing admin/moderator credentials.
 * 3. Try deleting the content flag by ID with member session — expect forbidden
 *    error.
 * 4. (Optional: Check the flag record still exists — omitted since API restricts
 *    flag read to admins/moderators).
 */
export async function test_api_discussionBoard_test_delete_content_flag_without_admin_role_forbidden(
  connection: api.IConnection,
) {
  // 1. As admin, create a content flag (on a post, for test purposes)
  const flagBody: IDiscussionBoardContentFlag.ICreate = {
    post_id: typia.random<string & tags.Format<"uuid">>(),
    flag_type: "test_flag_type",
    flag_source: "test_source",
    flag_details: "Setup for permission test",
  };
  const flag = await api.functional.discussionBoard.admin.contentFlags.create(
    connection,
    {
      body: flagBody,
    },
  );
  typia.assert(flag);

  // 2. Simulate ordinary member by removing privileged credentials from the connection
  if (connection.headers && connection.headers["Authorization"]) {
    delete connection.headers["Authorization"];
  }

  // 3. Attempt to delete the flag as an unprivileged member
  await TestValidator.error("delete forbidden for non-admin/non-moderator")(
    async () => {
      await api.functional.discussionBoard.admin.contentFlags.erase(
        connection,
        {
          contentFlagId: flag.id,
        },
      );
    },
  );

  // 4. (Omitted) Readback verification not possible: admin-only endpoint
}
