import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotice";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * Validate system notice listing (as admin) with simulated filtering and
 * pagination.
 *
 * This test evaluates listing the system notices as an admin user, after
 * seeding the database with a diverse set of notices. It simulates a realistic
 * moderation/operations workflow:
 *
 * 1. Seed at least two categories with random UUIDs (no category creation API
 *    provided, so UUIDs are generated).
 * 2. Create a variety of system notices—global and per-category, active/inactive,
 *    and scheduled—covering a broad range of states.
 * 3. Attempt to test pagination and filtering as described in scenario (note: SDK
 *    does not allow page/filter params, so test presence/structure indirectly
 *    by checking result content).
 * 4. Validate that the listing response reflects correct record count, pagination
 *    info, and presence/accuracy of seeded data.
 * 5. Assert that returned instances match the schema/types and that pagination
 *    meta is consistent with the created notices.
 * 6. Document limitations openly in code for future feature/test expansion (when
 *    filtering/paging params are supported by SDK).
 */
export async function test_api_discussionBoard_test_list_system_notices_as_admin_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Seed two random category UUIDs
  const categoryA = typia.random<string & tags.Format<"uuid">>();
  const categoryB = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Create system notices across categories/status/scheduled states
  const makeNotice = async (body: IDiscussionBoardSystemNotice.ICreate) =>
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      { body },
    );

  const now = new Date();
  const future = new Date(now.getTime() + 86400 * 1000).toISOString();

  const notices = [
    // Global, active now
    await makeNotice({
      title: "Global Active Now",
      body: "Body1",
      is_active: true,
    }),
    // Global, active, scheduled for future
    await makeNotice({
      title: "Global Active Future",
      body: "Body2",
      is_active: true,
      start_at: future,
    }),
    // CategoryA, active
    await makeNotice({
      title: "CatA Active1",
      body: "Body3",
      is_active: true,
      category_id: categoryA,
    }),
    await makeNotice({
      title: "CatA Active2",
      body: "SearchTarget",
      is_active: true,
      category_id: categoryA,
    }),
    // CategoryB, active
    await makeNotice({
      title: "CatB Active1",
      body: "Body5",
      is_active: true,
      category_id: categoryB,
    }),
    // CategoryB, inactive
    await makeNotice({
      title: "CatB Inactive",
      body: "Body6",
      is_active: false,
      category_id: categoryB,
    }),
    // Global, inactive
    await makeNotice({
      title: "Global Inactive",
      body: "Body7",
      is_active: false,
    }),
    // CategoryA, inactive
    await makeNotice({
      title: "CatA Inactive",
      body: "Body8",
      is_active: false,
      category_id: categoryA,
    }),
  ];
  notices.forEach((n) => typia.assert(n));

  // Step 3: List system notices using admin list endpoint
  const output =
    await api.functional.discussionBoard.admin.systemNotices.index(connection);
  typia.assert(output);

  // Step 4: Basic meta and data assertions
  TestValidator.predicate("system notice list is not empty")(
    output.data.length > 0,
  );
  TestValidator.equals("pagination records count")(output.pagination.records)(
    notices.length,
  );
  TestValidator.predicate("pagination meta fields valid")(
    typeof output.pagination.current === "number" &&
      typeof output.pagination.limit === "number" &&
      typeof output.pagination.records === "number" &&
      typeof output.pagination.pages === "number",
  );
  // Each returned object matches type
  output.data.forEach((n) => typia.assert(n));

  // Step 5: Indirect presence check for category filtering & text search
  TestValidator.predicate("has at least 1 CatA notice")(
    output.data.some((n) => n.category_id === categoryA),
  );
  TestValidator.predicate("has at least 1 CatB notice")(
    output.data.some((n) => n.category_id === categoryB),
  );
  TestValidator.predicate("has at least 1 global notice")(
    output.data.some((n) => !n.category_id),
  );
  TestValidator.predicate("has at least 1 SearchTarget title")(
    output.data.some((n) => n.title.includes("SearchTarget")),
  );

  // Step 6: Notes on limits
  // Current index endpoint has no querystring support for paging or filters; re-run is a full list.
  // Tests for page limiting, custom page, or explicit filtering must be expanded once SDK supports such params.
}
