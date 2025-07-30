import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";

/**
 * 감사 로그가 존재하지 않는 상태에서의 감사 로그 목록 조회 API 정상 동작을 검증합니다.
 *
 * 플랫폼 초기화 직후나 테스트 데이터 삭제 등으로 감사 로그가 전무한 상태에서,
 *
 * 1. /discussionBoard/admin/auditLogs 엔드포인트 호출 시 예외 없이 정상 응답을 반환할 것
 * 2. 응답의 data 필드(감사 로그 배열)가 빈 배열임을 보장할 것
 * 3. Pagination 정보(pagination.records, pagination.pages)가 0으로 표시되는지 확인할 것
 *
 * 이 검증을 통해 플랫폼의 초기 상태 신뢰성, 예외 대응, 대표적 엣지케이스 방어를 모두 확인할 수 있습니다.
 *
 * [프로세스]
 *
 * 1. 감사 로그 목록 API(/discussionBoard/admin/auditLogs) 호출
 * 2. 반환된 data가 빈 배열인지 확인
 * 3. Pagination의 records, pages 필드가 0인지 검증
 */
export async function test_api_discussionBoard_admin_auditLogs_index_with_no_records(
  connection: api.IConnection,
) {
  // 1. 감사 로그가 없는 상태에서 audit log 목록을 요청합니다.
  const page =
    await api.functional.discussionBoard.admin.auditLogs.index(connection);
  typia.assert(page);

  // 2. data 필드가 빈 배열임을 검증합니다.
  TestValidator.equals("no audit logs exist")(page.data)([]);

  // 3. pagination 정보의 records, pages 체크
  TestValidator.equals("records=0")(page.pagination.records)(0);
  TestValidator.equals("pages=0")(page.pagination.pages)(0);
}
