import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import type { IPageIDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Ensure that PATCH /discussionBoard/admin/settings is protected by admin
 * authentication.
 *
 * Business context: Only authenticated admins are allowed to access the
 * discussion board settings search endpoint. This test checks the API
 * access control by making a request WITHOUT any admin authentication. The
 * expectation is that the operation will be denied, resulting in an
 * authorization error.
 *
 * Step-by-step process:
 *
 * 1. Prepare a connection in a completely unauthenticated state (no
 *    Authorization header).
 * 2. Attempt to patch (search) discussion board settings via
 *    api.functional.discussionBoard.admin.settings.index with a sample
 *    request body.
 *
 *    - All fields in IDiscussionBoardSetting.IRequest are optional, so an empty
 *         object is sufficient for the negative authorization test.
 * 3. Assert that an error is thrown (TestValidator.error), indicating access
 *    was denied as expected.
 */
export async function test_api_admin_settings_paginated_list_access_denied_without_auth(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthorized connection: headers: {} means NO Authorization header is present
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Attempt to call PATCH /discussionBoard/admin/settings WITHOUT admin authentication
  await TestValidator.error(
    "access denied to discussion board admin settings without authentication",
    async () => {
      await api.functional.discussionBoard.admin.settings.index(unauthConn, {
        body: {}, // all fields optional; empty body for negative authorization test
      });
    },
  );
}
