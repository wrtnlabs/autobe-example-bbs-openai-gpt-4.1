import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotice";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * 시스템/카테고리별 공지사항 목록을 모더레이터 권한으로 모두 조회(상태 제한 없이) 검증하는 테스트.
 *
 * - 활성, 비활성(숨김), 미래 예약(스케줄), 기간 만료 등 시스템 공지사항을 각각 생성
 * - 모더레이터 권한으로 목록 전체를 조회하고, 직접 생성한 각 상태별 공지사항이 모두 반환되는지 확인
 * - 반환된 각 데이터에 category_id, title, body, is_active, start_at, end_at, created_at,
 *   updated_at 필드가 모두 포함되어 있는지 검증
 * - Pagination 정보(current, limit, records, pages)가 올바른지 확인
 *
 * Step by Step:
 *
 * 1. 관리자 권한으로 활성, 비활성, 예약, 만료 상태 시스템 공지사항 각각 생성
 * 2. 모더레이터 권한으로 시스템 공지사항 전체 목록을 조회
 * 3. 반환 데이터에서 1에서 만든 4개 ID가 모두 포함되는지 확인
 * 4. 각 공지에 모든 필수 메타 필드가 포함되어 있는지 체크(category_id, title, body, is_active, start_at,
 *    end_at, created_at, updated_at)
 * 5. Pagination 메타정보의 각 필드(current, limit, records, pages) 존재·타입·값 검증
 */
export async function test_api_discussionBoard_test_list_system_notices_as_moderator_with_access_to_all_visibility_statuses(
  connection: api.IConnection,
) {
  // 1. 다양한 상태의 공지사항을 관리자 권한에서 직접 생성
  const now = new Date();
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7일
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // -7일

  // 활성(공개)
  const noticeActive =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "[ACTIVE] 활성 공지",
          body: "이 공지는 즉시 활성화됨",
          is_active: true,
          start_at: null,
          end_at: null,
          category_id: null,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(noticeActive);

  // 비활성(숨김)
  const noticeInactive =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "[INACTIVE] 숨김 공지",
          body: "이 공지는 비활성 처리됨",
          is_active: false,
          start_at: null,
          end_at: null,
          category_id: null,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(noticeInactive);

  // 예약(미래 노출 예정)
  const noticeScheduled =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "[SCHEDULED] 예약 공지",
          body: "이 공지는 미래에 노출 예정",
          is_active: true,
          start_at: inOneWeek.toISOString(),
          end_at: null,
          category_id: null,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(noticeScheduled);

  // 만료(과거 노출)
  const noticeExpired =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "[EXPIRED] 만료 공지",
          body: "이 공지는 과거에 노출되었고 현재 만료됨",
          is_active: true,
          start_at: oneWeekAgo.toISOString(),
          end_at: now.toISOString(),
          category_id: null,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(noticeExpired);

  // 2. 모더레이터 권한으로 공지 목록 전체 불러오기
  const result =
    await api.functional.discussionBoard.moderator.systemNotices.index(
      connection,
    );
  typia.assert(result);

  // 3. 실제로 생성한 4개 각 notice의 id가 반환 데이터에 모두 존재하는지 확인
  const createdIds = [
    noticeActive.id,
    noticeInactive.id,
    noticeScheduled.id,
    noticeExpired.id,
  ];
  const returnedIds = result.data.map((n) => n.id);
  createdIds.forEach((id) => {
    TestValidator.predicate(`공지 ID(${id}) 포함 여부`)(
      returnedIds.includes(id),
    );
  });

  // 4. 반환 데이터의 메타 필드 체크
  result.data.forEach((notice) => {
    TestValidator.predicate("id 문자열 여부")(
      typeof notice.id === "string" && !!notice.id,
    );
    TestValidator.predicate("title 문자열 여부")(
      typeof notice.title === "string" && !!notice.title,
    );
    TestValidator.predicate("body 문자열 여부")(
      typeof notice.body === "string",
    );
    TestValidator.predicate("is_active 불린 여부")(
      typeof notice.is_active === "boolean",
    );
    TestValidator.predicate("created_at 문자열 여부")(
      typeof notice.created_at === "string",
    );
    TestValidator.predicate("updated_at 문자열 여부")(
      typeof notice.updated_at === "string",
    );
    // option field (nullable)
    TestValidator.predicate("category_id string/null/undefined 허용")(
      typeof notice.category_id === "string" ||
        notice.category_id === null ||
        notice.category_id === undefined,
    );
    TestValidator.predicate("start_at string/null/undefined 허용")(
      typeof notice.start_at === "string" ||
        notice.start_at === null ||
        notice.start_at === undefined,
    );
    TestValidator.predicate("end_at string/null/undefined 허용")(
      typeof notice.end_at === "string" ||
        notice.end_at === null ||
        notice.end_at === undefined,
    );
  });

  // 5. pagination 정보 각 필드 존재/타입 검증
  TestValidator.predicate("pagination.current number")(
    typeof result.pagination.current === "number",
  );
  TestValidator.predicate("pagination.limit number")(
    typeof result.pagination.limit === "number",
  );
  TestValidator.predicate("pagination.records number")(
    typeof result.pagination.records === "number",
  );
  TestValidator.predicate("pagination.pages number")(
    typeof result.pagination.pages === "number",
  );
}
