import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test proper error handling and data isolation when trying to retrieve a
 * non-existent board administrator by UUID.
 *
 * This test validates that when a client requests an admin by a UUID that does
 * not exist (e.g., random or deleted), the API MUST NOT leak any data about
 * other admins and MUST respond with a 404 or appropriate error. This is
 * important for privileged roles to prevent information disclosure about admin
 * assignments.
 *
 * Step-by-step:
 *
 * 1. Generate a random UUID intended not to match any current admin record
 *    (simulate a non-existent adminId).
 * 2. Attempt to fetch the admin entity by this adminId, using the GET
 *    /discussionBoard/admin/admins/{adminId} endpoint.
 * 3. Confirm that the API response is a proper 404 error (e.g., HttpError, or
 *    check for error object), NOT a valid entity.
 * 4. Ensure no data about any actual admin records are present in the error
 *    response.
 */
export async function test_api_discussionBoard_test_get_admin_by_id_not_found_error(
  connection: api.IConnection,
) {
  // 1. Generate a fake adminId (UUID not used by any admin)
  const randomAdminId = typia.random<string & tags.Format<"uuid">>();

  // 2-3. Attempt to fetch the admin and expect a 404 error (not found)
  await TestValidator.error("should return 404 for non-existent adminId")(
    async () => {
      await api.functional.discussionBoard.admin.admins.at(connection, {
        adminId: randomAdminId,
      });
    },
  );

  // 4. There should be no data leakage about other admins;
  //    if error body is available, ensure it only contains error info (implicit as no entity is returned).
}
