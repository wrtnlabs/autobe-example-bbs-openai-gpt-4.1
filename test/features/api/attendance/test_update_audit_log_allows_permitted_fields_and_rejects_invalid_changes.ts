import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuditLog";

/**
 * 감사 로그(Audit Log) 레코드의 수정(putById) 기능에 대한 E2E 테스트입니다.
 * 
 * 권한 있는 계정(예: 시스템 관리자/감사)이 정상적으로 허용된 필드(action_details, success, failed_reason 등)를 변경할 수 있는지,
 * 불변/제한된 필드(예: audited_at 등)를 수정하려 할 때 403/422 오류가 발생하는지,
 * 비허용값(ex: 잘못된 event_type, 존재하지 않는 actor_type)을 전달할 때 유효성 오류가 정상적으로 반환되는지,
 * 존재하지 않는 id에 접근 시 404,
 * 권한 없는 사용자가 수정 시도 시 403이 발생하는지까지 검증합니다.
 *
 * 1. (사전) 감사 로그를 1건 생성한다
 * 2. 권한 있는 계정으로 정상 허용 필드(action_details, success, failed_reason) 업데이트 성공을 확인한다
 * 3. 불변 필드(audited_at 등) 변경 시도를 하고 403 또는 422 에러가 발생함을 확인한다
 * 4. event_type에 시스템 정의값이 아닌 임의 문자열 전달 시 422 에러 확인
 * 5. 존재하지 않는 id를 지정하여 수정 요청 시 404 에러 확인
 * 6. (모킹) 권한 없는 계정이 수정 시도 시 403 Forbidden 발생 확인 (실제 환경에서 token 스위칭 필요)
 */
export async function test_api_attendance_test_update_audit_log_allows_permitted_fields_and_rejects_invalid_changes(connection: api.IConnection) {
  // 1. 감사 로그 최초 1건 생성
  const log = await api.functional.attendance.auditLogs.post(connection, {
    body: {
      event_type: "attendance_edit",
      action_details: "출결 정보 수정",
      success: true,
      audited_at: new Date().toISOString(),
      teacher_id: typia.random<string & tags.Format<"uuid">>(),
      student_id: null,
      parent_id: null,
      admin_id: null,
      classroom_id: null,
      failed_reason: null
    } satisfies IAttendanceAuditLog.ICreate
  });
  typia.assert(log);

  // 2. 정상 허용 필드 수정 성공
  const updated = await api.functional.attendance.auditLogs.putById(connection, {
    id: log.id,
    body: {
      action_details: "출결 정보 대량 수정",
      success: false,
      failed_reason: "대상 누락 발견, 롤백 처리"
    } satisfies IAttendanceAuditLog.IUpdate
  });
  typia.assert(updated);
  TestValidator.equals("수정 후 상세 설명")(updated.action_details)("출결 정보 대량 수정");
  TestValidator.equals("수정 후 실패 플래그")(updated.success)(false);
  TestValidator.equals("수정 후 실패 사유")(updated.failed_reason)("대상 누락 발견, 롤백 처리");

  // 3. 불변필드(audited_at 등) 변경 시도 - 에러 발생
  await TestValidator.error("불변필드 수정 시도(에러)")(
    async () => {
      await api.functional.attendance.auditLogs.putById(connection, {
        id: log.id,
        body: { audited_at: new Date(Date.now() + 1000 * 60 * 60).toISOString() } satisfies IAttendanceAuditLog.IUpdate
      });
    }
  );

  // 4. event_type 잘못된 값(예: 시스템에 없는 유형) 전달시 유효성 에러
  await TestValidator.error("event_type 잘못된 값 전달(유효성 에러)")(
    async () => {
      await api.functional.attendance.auditLogs.putById(connection, {
        id: log.id,
        body: { event_type: "invalid_type" } satisfies IAttendanceAuditLog.IUpdate
      });
    }
  );

  // 5. 존재하지 않는 id로 put 시도 - 404 에러
  await TestValidator.error("존재하지 않는 id로 수정 시도(404)")(
    async () => {
      await api.functional.attendance.auditLogs.putById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: { action_details: "존재하지 않는 id로 수정" } satisfies IAttendanceAuditLog.IUpdate
      });
    }
  );

  // 6. (모킹) 권한 없는 계정 토큰 하에서 put 시도 - 403 에러 (token 전환 필요)
  // 실제 환경, 권한 없는 connection 객체 필요 (별도 로그인/토큰 처리)
  // 본 예제에서는 connection 토큰 변경 가정, 실제 E2E 환경에선 별도 보조계정 생성/토큰 취득 후 시도 필요
  const connectionNoAuth = { ...connection, headers: { ...connection.headers, Authorization: "Bearer INVALID" } };
  await TestValidator.error("권한 없는 계정으로 수정 시도(403)")(
    async () => {
      await api.functional.attendance.auditLogs.putById(connectionNoAuth, {
        id: log.id,
        body: { action_details: "권한 없는 계정 수정 시도" } satisfies IAttendanceAuditLog.IUpdate
      });
    }
  );
}