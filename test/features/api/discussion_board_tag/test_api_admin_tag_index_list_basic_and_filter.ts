import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test admin discussion board tag pagination and filtering.
 *
 * - Registers and authenticates a new admin via /auth/admin/join.
 * - Creates multiple (at least 2) tags via /discussionBoard/admin/tags, with
 *   varying labels and is_active values.
 * - Fetches list of tags with no filter (just pagination), expects all
 *   created tags to be present in results.
 * - Fetches list filtered by label (one of the labels used), and expects only
 *   matching tag(s).
 * - Fetches list filtered by is_active (true or false), expects only tag(s)
 *   with matching status.
 * - Validates that response pagination metadata is correct for amount of
 *   data.
 * - Performs type and structure assertions on all API results, and checks
 *   that business filtering logic matches expected returned records.
 */
export async function test_api_admin_tag_index_list_basic_and_filter(
  connection: api.IConnection,
) {
  // Step 1: Admin registration/authentication
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);
  // Step 2: Create tags with varying attributes
  const tagInputs: IDiscussionBoardTag.ICreate[] = [
    {
      label: RandomGenerator.name(1),
      description: RandomGenerator.paragraph(),
      is_active: true,
    },
    {
      label: RandomGenerator.name(1),
      description: RandomGenerator.paragraph(),
      is_active: false,
    },
    // Add a 3rd tag for pagination testing
    {
      label: RandomGenerator.name(1),
      description: RandomGenerator.paragraph(),
      is_active: true,
    },
  ];
  const createdTags: IDiscussionBoardTag[] = [];
  for (const input of tagInputs) {
    const tag = await api.functional.discussionBoard.admin.tags.create(
      connection,
      {
        body: input satisfies IDiscussionBoardTag.ICreate,
      },
    );
    typia.assert(tag);
    createdTags.push(tag);
  }
  // Step 3: Fetch all (no filters, limit large enough) and confirm all created tags are present
  const resAll = await api.functional.discussionBoard.admin.tags.index(
    connection,
    {
      body: { page: 1, limit: 10 } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(resAll);
  TestValidator.predicate(
    "all created tags are present",
    createdTags.every((ct) =>
      resAll.data.some((rt) => rt.id === ct.id && rt.label === ct.label),
    ),
  );
  TestValidator.equals(
    "total records matches tag count",
    resAll.pagination.records,
    createdTags.length,
  );
  // Step 4: Filter by label (use first tag)
  const label = createdTags[0].label;
  const resLabel = await api.functional.discussionBoard.admin.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: label,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(resLabel);
  TestValidator.predicate(
    "label filter returns correct tag",
    resLabel.data.every((t) => t.label === label),
  );
  // Step 5: Filter by is_active (true)
  const resActive = await api.functional.discussionBoard.admin.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        is_active: true,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(resActive);
  TestValidator.predicate(
    "is_active=true only returns active tags",
    resActive.data.every((t) => t.is_active === true),
  );
  // Step 6: Filter by is_active (false)
  const resInactive = await api.functional.discussionBoard.admin.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        is_active: false,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(resInactive);
  TestValidator.predicate(
    "is_active=false only returns inactive tags",
    resInactive.data.every((t) => t.is_active === false),
  );
}
