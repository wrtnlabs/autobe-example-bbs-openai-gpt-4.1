import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 감사 로그 검색 시 잘못된 쿼리(예: 유효하지 않은 날짜 범위/미지원 필터 사용)를 보내면 검증 에러가 발생해야 함을 확인.
 *
 * - 비즈니스 목적: 운영 감사/보안 감사에서 필수로 검증되어야 할 입력 값 유효성, 필터 검증을 테스트함.
 * - 관리자는 로그인되어 있어야 하며 별도의 데이터 생성은 필요 없음.
 *
 * 테스트 순서:
 *
 * 1. (가정) 관리자가 이미 인증되어 있는 connection 제공, 별도의 인증 선행 테스트는 없음
 * 2. 날짜 범위를 역순(종료일이 시작일보다 이전)으로 요청 시도 => created_at_from > created_at_to
 * 3. Page, limit 음수 등 입력 불가 숫자 값
 * 4. 잘못된 uuid 포맷 값
 * 5. 각 쿼리 시도 후, 서버의 유효성 에러(HttpError 등)가 발생하는지 TestValidator.error로 검증
 * 6. 정상 응답(레코드 반환, 200 등)이 있으면 실패 처리
 *
 * 에러 메시지, status 등 세부 검증은 생략(단순 error 발생까지만 확인)
 */
export async function test_api_discussionBoard_test_search_audit_logs_with_invalid_query(
  connection: api.IConnection,
) {
  // 1. 날짜 범위가 비정상인 경우(예: created_at_from > created_at_to)
  const from = new Date("2025-09-01T00:00:00.000Z").toISOString();
  const to = new Date("2025-08-01T00:00:00.000Z").toISOString();

  await TestValidator.error(
    "Invalid date range: created_at_from > created_at_to",
  )(async () => {
    await api.functional.discussionBoard.admin.auditLogs.search(connection, {
      body: {
        created_at_from: from,
        created_at_to: to,
      },
    });
  });

  // 2. page, limit 음수 등 입력 불가 숫자 값
  await TestValidator.error("Invalid page/limit values (negative numbers)")(
    async () => {
      await api.functional.discussionBoard.admin.auditLogs.search(connection, {
        body: {
          page: -1 as any,
          limit: -1 as any,
        },
      });
    },
  );

  // 3. 잘못된 uuid 포맷 값
  await TestValidator.error("Invalid uuid format for actor_id")(async () => {
    await api.functional.discussionBoard.admin.auditLogs.search(connection, {
      body: {
        actor_id: "not-a-uuid" as any,
      },
    });
  });
}
