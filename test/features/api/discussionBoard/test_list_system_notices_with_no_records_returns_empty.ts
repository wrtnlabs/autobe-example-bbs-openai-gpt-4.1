import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotice";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * [System Notice List - Empty State, Pagination 검증]
 *
 * 시스템 공지 엔터티(announcement, notice 등)가 데이터베이스에 아무것도 없는 "초기화/샌드박스" 상태에서, Admin
 * 시스템 공지 리스트(`/discussionBoard/admin/systemNotices`) 엔드포인트가 빈 배열과 올바른
 * pagination 메타데이터(records:0, pages:0)를 오류 없이 반환하는지 검증합니다.
 *
 * - 비즈니스 목적: 정상적으로 공지가 하나도 없는 상태에서 조회했을 때 결과가 착오 없이 처리되는지 확인(스모크/샌드박스/최초 배포 검증에
 *   적합)
 * - 주의: 별도의 데이터 삭제 API 등 리셋 수단이 없다면 반드시 깨끗한 테스트 환경(초기 상태)에서만 의미있음
 *
 * [Test Steps]
 *
 * 1. 시스템 공지 데이터가 하나도 없는 초기 상태임을 전제로, 관리자 컨텍스트(connection)로 리스트 조회 API를 호출
 * 2. 반환된 결과 데이터의 data 배열이 빈 배열([])임을 확인
 * 3. Pagination.records 및 pagination.pages가 0임을 확인(전체 데이터가 존재하지 않음)
 * 4. 응답 전체의 타입 일치성을 typia.assert로 검증
 */
export async function test_api_discussionBoard_test_list_system_notices_with_no_records_returns_empty(
  connection: api.IConnection,
) {
  // 1. 시스템 공지 데이터 없음(초기화 상태 가정. reset/clean DB 환경 필요)

  // 2. 관리자 권한으로 시스템 공지 목록 조회 API 호출
  const output =
    await api.functional.discussionBoard.admin.systemNotices.index(connection);

  // 3. 반환 결과의 타입 일치성 검증
  typia.assert(output);

  // 4. data 배열이 실제 빈 배열인지 확인
  TestValidator.equals("empty notices array")(output.data)([]);

  // 5. pagination records 및 pages가 모두 0인지 확인
  TestValidator.equals("pagination.records is 0")(output.pagination.records)(0);
  TestValidator.equals("pagination.pages is 0")(output.pagination.pages)(0);
}
