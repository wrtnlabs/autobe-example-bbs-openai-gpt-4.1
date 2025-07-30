import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPageIDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotice";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * Validate category-based filtering and pagination for system notice listing
 * (moderator API).
 *
 * Business context: The discussion board supports system notices that may be
 * global (not category-limited) or assigned to a specific category. Moderators
 * need to see both global and category-specific notices, and UI/UX needs to
 * confirm list/pagination and filtering work.
 *
 * Steps:
 *
 * 1. Admin creates a board category.
 * 2. Admin creates a system notice linked to that category (category-specific
 *    notice).
 * 3. Admin creates several global notices (category_id null).
 * 4. (Optional) Admin creates additional notices to ensure there are enough to
 *    test pagination (limit/page behavior).
 * 5. Moderator calls GET /discussionBoard/moderator/systemNotices to list notices
 *    (covering both unfiltered and filtered scenarios if query params
 *    supported).
 * 6. Verify response contains both the category-specific and global notices (at
 *    minimum). Ensure notices have expected fields and correct category
 *    linkage.
 * 7. If pagination is triggered, confirm paging info (total records, limit, pages,
 *    correct number of results). As API doesn't accept paging query params,
 *    this only confirms 1st page info.
 */
export async function test_api_discussionBoard_test_list_system_notices_pagination_and_filtering_by_category_id(
  connection: api.IConnection,
) {
  // 1. Admin creates a board category
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: `Category_${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph()(),
        is_active: true,
      } satisfies IDiscussionBoardCategory.ICreate,
    },
  );
  typia.assert(category);

  // 2. Create a category-specific notice
  const noticeByCategory =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: `Cat-Notice_${RandomGenerator.alphaNumeric(5)}`,
          body: RandomGenerator.paragraph()(),
          is_active: true,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(noticeByCategory);

  // 3. Create multiple global notices (category_id null)
  const globalNotices: IDiscussionBoardSystemNotice[] = [];
  for (let i = 0; i < 7; ++i) {
    // Create enough notices to test pagination (assuming default limit is sufficiently small)
    const notice =
      await api.functional.discussionBoard.admin.systemNotices.create(
        connection,
        {
          body: {
            category_id: null,
            title: `GlobalNotice_${i}_${RandomGenerator.alphaNumeric(4)}`,
            body: RandomGenerator.paragraph()(),
            is_active: true,
          } satisfies IDiscussionBoardSystemNotice.ICreate,
        },
      );
    typia.assert(notice);
    globalNotices.push(notice);
  }

  // 4. Moderator requests the notice list
  const response =
    await api.functional.discussionBoard.moderator.systemNotices.index(
      connection,
    );
  typia.assert(response);

  // 5. Validate that both global and category-specific notices are found
  // -- Contains category-specific notice
  TestValidator.predicate("category-specific notice included")(
    response.data.some(
      (n) => n.id === noticeByCategory.id && n.category_id === category.id,
    ),
  );
  // -- Contains all created global notices
  for (const notice of globalNotices) {
    TestValidator.predicate(`global notice ${notice.title} included`)(
      response.data.some((n) => n.id === notice.id && n.category_id === null),
    );
  }

  // -- Specific validation on linkage fields
  TestValidator.equals("category_id linkage")(noticeByCategory.category_id)(
    category.id,
  );
  for (const notice of globalNotices) {
    TestValidator.equals("global notice has null category_id")(
      notice.category_id,
    )(null);
  }

  // 6. Check paging information (on 1st result page, as query-args not supported)
  TestValidator.predicate("records count >= created")(
    response.pagination.records >= 1 + globalNotices.length,
  );
  TestValidator.predicate("page size <= limit")(
    response.data.length <= response.pagination.limit,
  );
  TestValidator.predicate("page count > 0")(response.pagination.pages > 0);
}
