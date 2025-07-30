import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 게시판 카테고리 고급 검색 및 필터링 기능을 검증한다.
 *
 * 다양한 이름 조합, 활성/비활성 상태를 가진 카테고리를 미리 생성하고, 부분 문자열(검색어) 및 활성화/비활성화 상태 조합으로 필터링했을
 * 때, 서버가 정확히 해당 조건만 반환하는지(대소문자 구분 없이) 검증한다. 또한, 페이지네이션(page/limit) 동작과
 * pagination 메타데이터 정확성도 확인한다.
 *
 * 1. 다양한 이름과 활성 상태로 카테고리를 여러 개 생성한다 (관리자 API 사용).
 * 2. 부분 문자열 및 활성상태 조합을 검색조건(name, is_active)에 입력하여 조회한다.
 * 3. 응답 배열의 모든 항목이 검색어(부분 문자열)를 이름에 대소문자 무관 포함하는지와 is_active 상태가 일치하는지 검증한다.
 * 4. 페이징 조건(limit, page)으로 요청 시 기대한 개수 이하만 반환되는지, pagination 정보가 정확한지 확인한다.
 * 5. 이름 매치 없음, status 미일치 상황 등도 테스트한다.
 */
export async function test_api_discussionBoard_test_advanced_filter_and_search_categories_by_name_and_status(
  connection: api.IConnection,
) {
  // 1. 다양한 이름과 활성/비활성 카테고리 생성
  const categories: IDiscussionBoardCategory[] = [];
  const nameVariants = [
    "공지사항",
    "이벤트",
    "사용자후기",
    "질문답변",
    "이슈트래커",
    "Product Support",
    "User Q&A",
    "Notice Board",
    "EventPromo",
    "ISSUE_LOG",
  ];
  for (let i = 0; i < nameVariants.length; ++i) {
    const category =
      await api.functional.discussionBoard.admin.categories.create(connection, {
        body: {
          name: nameVariants[i],
          is_active: i % 2 === 0,
          description: `카테고리 설명-${i}`,
          parent_id: null,
        } satisfies IDiscussionBoardCategory.ICreate,
      });
    typia.assert(category);
    categories.push(category);
  }

  // 2. 부분 문자열(이름) 및 활성 상태별 고급 필터/검색 테스트
  const testCases: [string, boolean | null][] = [
    ["공지", true],
    ["이벤", false],
    ["user", null],
    ["Board", true],
    ["ISSUE", null],
    ["없음", true], // 매치 없음 테스트
  ];

  for (const [search, is_active] of testCases) {
    const result = await api.functional.discussionBoard.categories.search(
      connection,
      {
        body: {
          name: search,
          is_active: is_active,
        } satisfies IDiscussionBoardCategory.IRequest,
      },
    );
    typia.assert(result);

    // 응답 data - 검색 조건 일치성 확인(대소문자 무관), 상태 필터 적용 확인
    for (const item of result.data) {
      TestValidator.predicate(`카테고리명에 '${search}'(이)가 포함되어야 함`)(
        item.name.toLowerCase().includes(search.toLowerCase()),
      );
      if (is_active !== null)
        TestValidator.equals(`is_active 일치 여부`)(item.is_active)(is_active);
    }
  }

  // 3. 페이지네이션(paging) 동작 및 정보 검증
  const limit = 3;
  const page = 2;
  const resultPage = await api.functional.discussionBoard.categories.search(
    connection,
    {
      body: {
        limit,
        page,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(resultPage);
  TestValidator.equals("요청한 페이지 limit")(resultPage.pagination.limit)(
    limit,
  );
  TestValidator.equals("요청한 페이지 current")(resultPage.pagination.current)(
    page,
  );
  TestValidator.predicate("data 길이 limit 이하")(
    resultPage.data.length <= limit,
  );
}
