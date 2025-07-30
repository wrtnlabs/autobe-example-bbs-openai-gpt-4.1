import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * 시스템 공지사항 생성 시 카테고리 내 제목의 유일성을 검증한다.
 *
 * - 기본적으로 공지 제목은 같은 카테고리 내에서 중복을 허용하지 않아야 한다. (글로벌 공지/타 카테고리는 별개로 취급)
 *
 * 테스트 플로우:
 *
 * 1. 하나의 카테고리(category_id)와 특정 제목(title)으로 공지A를 등록한다.
 * 2. 같은 카테고리(category_id)와 같은 제목(title)으로 공지B 재생성 시도 → 반드시 에러(Business validation
 *    error) 발생해야 한다.
 * 3. 다른 카테고리(anotherCategoryId)로 같은 제목(title) 공지 등록 → 정상적으로 등록 성공
 * 4. 첫번째 카테고리(category_id)에 다른 제목(title + "-V2")으로 공지 등록 → 정상적으로 등록 성공
 */
export async function test_api_discussionBoard_admin_systemNotices_test_create_system_notice_with_duplicate_title_in_category(
  connection: api.IConnection,
) {
  // 1. 최초 공지 등록 (category_id, title)
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const title = "UniqTitle-" + RandomGenerator.alphaNumeric(10);
  const body = RandomGenerator.paragraph()();

  const firstNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          category_id: categoryId,
          title,
          body,
          is_active: true,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(firstNotice);
  TestValidator.equals("category match")(firstNotice.category_id)(categoryId);
  TestValidator.equals("title match")(firstNotice.title)(title);

  // 2. 같은 category + 같은 title → 실패 (expect error)
  await TestValidator.error("duplicate title in same category should fail")(
    async () => {
      await api.functional.discussionBoard.admin.systemNotices.create(
        connection,
        {
          body: {
            category_id: categoryId,
            title,
            body: body + " (copy)",
            is_active: true,
          } satisfies IDiscussionBoardSystemNotice.ICreate,
        },
      );
    },
  );

  // 3. 다른 category + 같은 title → 성공
  const anotherCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const secondNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          category_id: anotherCategoryId,
          title,
          body,
          is_active: true,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(secondNotice);
  TestValidator.equals("category match")(secondNotice.category_id)(
    anotherCategoryId,
  );
  TestValidator.equals("title match")(secondNotice.title)(title);

  // 4. 같은 category + 다른 title → 성공
  const thirdNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          category_id: categoryId,
          title: title + "-V2",
          body,
          is_active: true,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(thirdNotice);
  TestValidator.equals("category match")(thirdNotice.category_id)(categoryId);
  TestValidator.equals("title match")(thirdNotice.title)(title + "-V2");
}
