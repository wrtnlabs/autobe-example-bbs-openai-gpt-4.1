import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuditLog";

/**
 * 감사 로그 상세 정보 정상/예외 조회 시나리오
 *
 * - 존재하는 감사 로그 id로 상세조회 시 정상 정보 반환을 검증합니다.
 *   - 반환 데이터의 모든 필드(액터, 이벤트 유형, 대상, 이벤트 상세, 성공/실패 등)가 스키마(IAttendanceAuditLog)에 맞는지 typia.assert로 체크합니다.
 *   - 주요 필드는 생성시 값과 일치하는지 TestValidator.equals로 비교합니다.
 * - 임의/존재하지 않는 id로 조회 시 404 Not Found가 발생하는 오류 케이스를 확인합니다.
 * - (구현 가능 시) 권한 없는 사용자의 접근 요청에 대해 403 Forbidden 오류가 발생하는지 확인합니다.
 *
 * [테스트 절차]
 * 1. 감사 로그를 먼저 한 건 생성합니다 (POST /attendance/auditLogs 이용)
 * 2. 생성된 id로 상세조회(GET /attendance/auditLogs/{id})하고 모든 필드/값을 검증합니다.
 * 3. 존재하지 않는 임의의 UUID로 조회 시 404 에러가 발생하는지 확인합니다.
 * 4. (선택) 권한이 없는 connection 환경에서 동일 요청 시 403 에러를 검증합니다 (테스트 환경 미지원 시 제외)
 */
export async function test_api_attendance_test_get_audit_log_detail_valid_and_invalid_id(
  connection: api.IConnection,
) {
  // 1. 감사 로그를 미리 생성
  const created: IAttendanceAuditLog = await api.functional.attendance.auditLogs.post(connection, {
    body: {
      event_type: "test_event",
      action_details: "테스트 감사 이벤트 상세",
      audited_at: new Date().toISOString(),
      success: true,
      teacher_id: null,
      student_id: null,
      parent_id: null,
      admin_id: null,
      classroom_id: null,
      failed_reason: null,
    } satisfies IAttendanceAuditLog.ICreate,
  });
  typia.assert(created);

  // 2. 정상 id로 상세 조회 (반환 값의 스키마와 값 검증)
  const detail: IAttendanceAuditLog = await api.functional.attendance.auditLogs.getById(connection, {
    id: created.id,
  });
  typia.assert(detail);
  TestValidator.equals("id 일치")(detail.id)(created.id);
  TestValidator.equals("event_type 일치")(detail.event_type)(created.event_type);
  TestValidator.equals("action_details 일치")(detail.action_details)(created.action_details);
  TestValidator.equals("성공여부 일치")(detail.success)(created.success);
  TestValidator.equals("실패사유 일치")(detail.failed_reason)(created.failed_reason);

  // 3. 존재하지 않는 id로 조회 시 404 에러 검증
  await TestValidator.error("없는 id 조회시 404")(async () => {
    await api.functional.attendance.auditLogs.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 4. (선택) 권한 없는 connection 환경에서 403 에러 확인 (구현 가능시 아래 주석 해제 후 테스트)
  /*
  await TestValidator.error("권한 없는 접근은 403")(async () => {
    await api.functional.attendance.auditLogs.getById(noAuthConnection, {
      id: created.id,
    });
  });
  */
}