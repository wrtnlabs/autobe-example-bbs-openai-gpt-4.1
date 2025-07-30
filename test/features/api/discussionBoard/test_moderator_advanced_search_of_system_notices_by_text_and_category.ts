import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";
import type { IPageIDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotice";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced system notice search by moderators with text and category
 * filters.
 *
 * This test verifies that moderators can:
 *
 * - Search system notices by title and body keywords (fulltext search)
 * - Filter notices by a specific category
 *
 * The test creates:
 *
 * - Two categories (catA and catB)
 * - 4 system notices: (a) Global, title="Welcome", body="This is a system-wide
 *   update." (b) Category A only, title="CatA Issue", body="Notice for category
 *   A." (c) Category B only, title="CatB Maint", body="Maintenance for B." (d)
 *   Category A only, title="Update", body="CatA big changes."
 *
 * Test steps:
 *
 * 1. Create categories catA and catB
 * 2. Create system notices as above (some with category_id=null for global)
 * 3. Moderator searches for notices with title contains "cat" (should match b & c)
 * 4. Search by category_id = catA.id (should yield notices b & d)
 * 5. Search by title contains "update" AND category_id = catA.id (should yield
 *    only d)
 * 6. Search by a non-existent keyword (should return zero notices)
 * 7. Validate all filtering is correct and returns only matching items.
 */
export async function test_api_discussionBoard_test_moderator_advanced_search_of_system_notices_by_text_and_category(
  connection: api.IConnection,
) {
  // 1. Create two categories: catA and catB
  const catA = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: "CategoryA",
        is_active: true,
      } satisfies IDiscussionBoardCategory.ICreate,
    },
  );
  typia.assert(catA);

  const catB = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: "CategoryB",
        is_active: true,
      } satisfies IDiscussionBoardCategory.ICreate,
    },
  );
  typia.assert(catB);

  // 2. Create 4 notices (global and per category)
  // a) Global
  const noticeGlobal =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          category_id: null,
          title: "Welcome",
          body: "This is a system-wide update.",
          is_active: true,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(noticeGlobal);

  // b) catA
  const noticeCatA =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          category_id: catA.id,
          title: "CatA Issue",
          body: "Notice for category A.",
          is_active: true,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(noticeCatA);

  // c) catB
  const noticeCatB =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          category_id: catB.id,
          title: "CatB Maint",
          body: "Maintenance for B.",
          is_active: true,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(noticeCatB);

  // d) catA, another
  const noticeA2 =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          category_id: catA.id,
          title: "Update",
          body: "CatA big changes.",
          is_active: true,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(noticeA2);

  // 3. Search: title contains "cat" (case-insensitive)
  const searchCat =
    await api.functional.discussionBoard.moderator.systemNotices.search(
      connection,
      {
        body: { title: "cat" } satisfies IDiscussionBoardSystemNotice.IRequest,
      },
    );
  typia.assert(searchCat);
  TestValidator.predicate("title keyword: only cat-related")(
    searchCat.data.every((n) => /cat/i.test(n.title)),
  );

  // 4. Search by category_id: catA
  const searchCatA =
    await api.functional.discussionBoard.moderator.systemNotices.search(
      connection,
      {
        body: {
          category_id: catA.id,
        } satisfies IDiscussionBoardSystemNotice.IRequest,
      },
    );
  typia.assert(searchCatA);
  TestValidator.predicate("categoryA filter")(
    searchCatA.data.every((n) => n.category_id === catA.id),
  );

  // 5. Search by title contains "update" AND category_id = catA.id
  const searchUpdateA =
    await api.functional.discussionBoard.moderator.systemNotices.search(
      connection,
      {
        body: {
          title: "update",
          category_id: catA.id,
        } satisfies IDiscussionBoardSystemNotice.IRequest,
      },
    );
  typia.assert(searchUpdateA);
  TestValidator.equals("single match for update + catA")(
    searchUpdateA.data.length,
  )(1);
  TestValidator.equals("correct notice for update + catA")(
    searchUpdateA.data[0].id,
  )(noticeA2.id);

  // 6. Negative: Search by a non-existent keyword
  const searchNegative =
    await api.functional.discussionBoard.moderator.systemNotices.search(
      connection,
      {
        body: {
          title: "nonexistentkeyword",
        } satisfies IDiscussionBoardSystemNotice.IRequest,
      },
    );
  typia.assert(searchNegative);
  TestValidator.equals("empty for nonexistent keyword")(
    searchNegative.data.length,
  )(0);
}
