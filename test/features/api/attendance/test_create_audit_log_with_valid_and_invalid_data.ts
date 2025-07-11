import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuditLog";

/**
 * 감사 로그 생성 기능의 E2E 검증
 *
 * 이 테스트는 다음을 검증합니다.
 * 1. 모든 필수 필드(액터, event_type, action_details, success, audited_at 등)를 올바르게 입력하면 정상적으로 감사 로그가 생성되고 반환 객체가 입력과 정확히 매칭됨을 확인
 * 2. 필수 필드 누락, 잘못된 값(존재하지 않는 FK, 상황에 맞지 않는 event_type 등)에는 서버가 422/404/409 등 적절한 오류를 반환하는지 확인
 *
 * 상세 시나리오:
 * - 정상 입력(예: teacher_id, 합법 event_type 등)으로 insert 성공
 * - 필수 필드 누락 각각(teacher_id, event_type, action_details, success, audited_at 등) 시도 → 422
 * - 존재하지 않는 UUID(teacher_id 등)에 대한 시도 → 404/409
 * - 존재하지 않는/비표준 event_type, 논리적으로 말이 안 되는 FK 조합 등 → 422
 */
export async function test_api_attendance_test_create_audit_log_with_valid_and_invalid_data(
  connection: api.IConnection,
) {
  // 1. 정상 케이스: 모든 필수 필드 포함, 정상 actor/event 등
  const now = new Date();
  const logInput: IAttendanceAuditLog.ICreate = {
    teacher_id: typia.random<string & tags.Format<"uuid">>(),
    event_type: "attendance_edit",
    action_details: "2025-07-09 3반 전체 출결 수정",
    audited_at: now.toISOString(),
    success: true,
    failed_reason: null,
  };
  const output = await api.functional.attendance.auditLogs.post(connection, { body: logInput });
  typia.assert(output);
  TestValidator.equals("입력값과 반환값 매칭")(output.event_type)(logInput.event_type);
  TestValidator.equals("입력값과 반환값 매칭")(output.action_details)(logInput.action_details);
  TestValidator.equals("입력값과 반환값 매칭")(output.teacher_id)(logInput.teacher_id);
  TestValidator.equals("입력값과 반환값 매칭")(output.success)(logInput.success);
  TestValidator.equals("입력값과 반환값 매칭")(output.audited_at)(logInput.audited_at);

  // 2. 필수 필드 누락 케이스
  await TestValidator.error("teacher_id 누락시 실패")(() =>
    api.functional.attendance.auditLogs.post(connection, {
      body: {
        event_type: "attendance_edit",
        action_details: "교사ID 빠진 상황",
        success: true,
        audited_at: now.toISOString(),
      } as any,
    }),
  );
  await TestValidator.error("event_type 누락시 실패")(() =>
    api.functional.attendance.auditLogs.post(connection, {
      body: {
        teacher_id: typia.random<string & tags.Format<"uuid">>(),
        action_details: "event_type 빠진 상황",
        success: true,
        audited_at: now.toISOString(),
      } as any,
    }),
  );
  await TestValidator.error("action_details 누락시 실패")(() =>
    api.functional.attendance.auditLogs.post(connection, {
      body: {
        teacher_id: typia.random<string & tags.Format<"uuid">>(),
        event_type: "attendance_edit",
        success: true,
        audited_at: now.toISOString(),
      } as any,
    }),
  );
  await TestValidator.error("audited_at 누락시 실패")(() =>
    api.functional.attendance.auditLogs.post(connection, {
      body: {
        teacher_id: typia.random<string & tags.Format<"uuid">>(),
        event_type: "attendance_edit",
        action_details: "시간 누락 상황",
        success: true,
      } as any,
    }),
  );
  await TestValidator.error("success 누락시 실패")(() =>
    api.functional.attendance.auditLogs.post(connection, {
      body: {
        teacher_id: typia.random<string & tags.Format<"uuid">>(),
        event_type: "attendance_edit",
        action_details: "성공여부 누락 상황",
        audited_at: now.toISOString(),
      } as any,
    }),
  );

  // 3. 존재하지 않는 FK(UUID)로 실패 케이스
  await TestValidator.error("존재하지 않는 teacher_id")(() =>
    api.functional.attendance.auditLogs.post(connection, {
      body: {
        teacher_id: "00000000-0000-0000-0000-000000000000",
        event_type: "attendance_edit",
        action_details: "존재하지 않는 teacher_id",
        success: true,
        audited_at: now.toISOString(),
      },
    }),
  );

  // 4. 잘못된 event_type 등 기타 논리적 제약 검사
  await TestValidator.error("비표준 event_type")(() =>
    api.functional.attendance.auditLogs.post(connection, {
      body: {
        teacher_id: typia.random<string & tags.Format<"uuid">>(),
        event_type: "not_exists_type",
        action_details: "비표준 이벤트타입",
        success: true,
        audited_at: now.toISOString(),
      },
    }),
  );
}