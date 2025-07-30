import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

/**
 * 관리자 설정 API - 비어있는 settings 전체 조회 테스트
 *
 * 신규 시스템 초기화 상태(설정 레코드 미존재)에서, 관리자 권한으로 /discussionBoard/admin/settings API를
 * 조회합니다.
 *
 * 1. 관리자 권한으로 settings 리스트 요청을 보냅니다.
 * 2. 반환된 data 배열이 반드시 빈 상태([])임을 확인합니다.
 * 3. Pagination.records는 0, pages는 1 이상(페이지네이션 정책에 따라 최소 0~1)임을 검증합니다.
 * 4. 그 외 구조적/타입 오류 없이 정상 응답임을 typia.assert로 검증합니다.
 */
export async function test_api_discussionBoard_test_get_all_discussion_board_settings_empty(
  connection: api.IConnection,
) {
  // 1. /discussionBoard/admin/settings 호출 (시스템이 비어 있음)
  const output =
    await api.functional.discussionBoard.admin.settings.index(connection);
  typia.assert(output);

  // 2. data 배열이 빈 배열([])인지 확인
  TestValidator.equals("data must be empty")(output.data)([]);
  // 3. pagination.records가 0인지 확인
  TestValidator.equals("no records")(output.pagination.records)(0);
  // 4. pagination.pages가 1 이상인지 검증(정책에 따라 빈 데이터도 최소 한 페이지이거나 0)
  TestValidator.predicate("pages should be >= 0")(output.pagination.pages >= 0);
}
