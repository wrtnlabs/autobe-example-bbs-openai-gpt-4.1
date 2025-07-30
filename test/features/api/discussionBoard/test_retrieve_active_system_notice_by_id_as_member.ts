import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * Validate that a member can retrieve an active, public system notice by its
 * UUID.
 *
 * This test checks that a member (non-admin user) can fetch the full details of
 * an active system notice via its unique UUID. It first ensures a system notice
 * is created (by an admin) with is_active=true, explicit scheduling and
 * category association (nullable fields covered). The member then retrieves
 * this notice, and every property is checked: id, title, body, category_id
 * (nullable), is_active, start_at/end_at (nullable), and timestamps. It must be
 * visible for active+public notices only. Non-existent notice should yield 404.
 * Inactive notices are not accessible to members.
 *
 * Steps:
 *
 * 1. Admin creates an active, public system notice (global: category_id is null)
 * 2. Member requests the notice detail by its UUID and asserts all fields
 * 3. Admin creates a category-linked, active notice (category_id non-null, tests
 *    both cases)
 * 4. Member requests the category-linked notice and asserts all fields
 * 5. Admin creates an inactive notice, member must not be able to retrieve it
 *    (should throw 404)
 * 6. Member tries random/non-existent UUID, expects error/404
 */
export async function test_api_discussionBoard_member_systemNotices_at(
  connection: api.IConnection,
) {
  // 1. Admin creates a global (category_id=null), active notice with full fields
  const globalNoticeInput: IDiscussionBoardSystemNotice.ICreate = {
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    is_active: true,
    category_id: null,
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24h from now
  };
  const globalNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      { body: globalNoticeInput },
    );
  typia.assert(globalNotice);

  // 2. Member fetches the global notice by UUID
  const fetchedGlobalNotice =
    await api.functional.discussionBoard.member.systemNotices.at(connection, {
      systemNoticeId: globalNotice.id,
    });
  typia.assert(fetchedGlobalNotice);
  // Validate all fields match creation
  TestValidator.equals("id matches")(fetchedGlobalNotice.id)(globalNotice.id);
  TestValidator.equals("title matches")(fetchedGlobalNotice.title)(
    globalNoticeInput.title,
  );
  TestValidator.equals("body matches")(fetchedGlobalNotice.body)(
    globalNoticeInput.body,
  );
  TestValidator.equals("is_active matches")(fetchedGlobalNotice.is_active)(
    globalNoticeInput.is_active,
  );
  TestValidator.equals("category_id matches")(fetchedGlobalNotice.category_id)(
    globalNoticeInput.category_id,
  );
  TestValidator.equals("start_at matches")(fetchedGlobalNotice.start_at)(
    globalNoticeInput.start_at,
  );
  TestValidator.equals("end_at matches")(fetchedGlobalNotice.end_at)(
    globalNoticeInput.end_at,
  );
  TestValidator.predicate("created_at present")(
    typeof fetchedGlobalNotice.created_at === "string",
  );
  TestValidator.predicate("updated_at present")(
    typeof fetchedGlobalNotice.updated_at === "string",
  );

  // 3. Admin creates a category-linked, active notice
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const categoryNoticeInput: IDiscussionBoardSystemNotice.ICreate = {
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    is_active: true,
    category_id: categoryId,
    start_at: null,
    end_at: null,
  };
  const categoryNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      { body: categoryNoticeInput },
    );
  typia.assert(categoryNotice);

  // 4. Member fetches the category-linked notice by UUID
  const fetchedCategoryNotice =
    await api.functional.discussionBoard.member.systemNotices.at(connection, {
      systemNoticeId: categoryNotice.id,
    });
  typia.assert(fetchedCategoryNotice);
  // Validate all fields
  TestValidator.equals("id matches")(fetchedCategoryNotice.id)(
    categoryNotice.id,
  );
  TestValidator.equals("title matches")(fetchedCategoryNotice.title)(
    categoryNoticeInput.title,
  );
  TestValidator.equals("body matches")(fetchedCategoryNotice.body)(
    categoryNoticeInput.body,
  );
  TestValidator.equals("is_active matches")(fetchedCategoryNotice.is_active)(
    categoryNoticeInput.is_active,
  );
  TestValidator.equals("category_id matches")(
    fetchedCategoryNotice.category_id,
  )(categoryNoticeInput.category_id);
  TestValidator.equals("start_at matches")(fetchedCategoryNotice.start_at)(
    categoryNoticeInput.start_at,
  );
  TestValidator.equals("end_at matches")(fetchedCategoryNotice.end_at)(
    categoryNoticeInput.end_at,
  );
  TestValidator.predicate("created_at present")(
    typeof fetchedCategoryNotice.created_at === "string",
  );
  TestValidator.predicate("updated_at present")(
    typeof fetchedCategoryNotice.updated_at === "string",
  );

  // 5. Admin creates an inactive notice (not visible to members)
  const inactiveNoticeInput: IDiscussionBoardSystemNotice.ICreate = {
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    is_active: false,
    category_id: null,
    start_at: null,
    end_at: null,
  };
  const inactiveNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      { body: inactiveNoticeInput },
    );
  typia.assert(inactiveNotice);
  // Member must not be able to retrieve this notice (should throw 404)
  await TestValidator.error("inactive notice not found for member")(() =>
    api.functional.discussionBoard.member.systemNotices.at(connection, {
      systemNoticeId: inactiveNotice.id,
    }),
  );

  // 6. Member attempts to fetch a completely non-existent notice
  await TestValidator.error("non-existent notice should not be found")(() =>
    api.functional.discussionBoard.member.systemNotices.at(connection, {
      systemNoticeId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );
}
