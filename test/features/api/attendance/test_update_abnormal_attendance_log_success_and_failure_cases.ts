import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceAttendanceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceRecord";
import type { IAttendanceStatsAbnormalLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsAbnormalLog";

/**
 * 출석 이상 로그(비정상 출석 탐지/감지 기록) PUT API의 정상 케이스와 각종 실패 케이스(존재하지 않는 ID, FK 위반 등)를 검증합니다.
 *
 * - 담당자(교사) 생성, 출석 레코드 생성, 이상 로그 생성을 순차적으로 처리한 뒤,
 * - 변경 가능한 필드(status, admin_id, resolved_at)를 정상적으로 수정 후 값 반영 및 변경이력(updated_at, created_at) 변동을 확인합니다.
 * - 잘못된 ID(404), FK 위반(admin_id 오류, 422)을 포함한 실패 케이스도 함께 검증합니다.
 * - 권한 부족(403)은 별도 인증/역할 전환 API가 제공되지 않는 환경에서는 시나리오상 스킵합니다.
 */
export async function test_api_attendance_test_update_abnormal_attendance_log_success_and_failure_cases(connection: api.IConnection) {
  // 1. 담당 교사 생성
  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: typia.random<string & tags.Format<"uuid">>(),
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    }
  });
  typia.assert(teacher);

  // 2. 출석 레코드 생성 (student_id/classroom_id 등 랜덤, 교사ID 연결)
  const attendanceRecord = await api.functional.attendance.attendanceRecords.post(connection, {
    body: {
      student_id: typia.random<string & tags.Format<"uuid">>(),
      classroom_id: typia.random<string & tags.Format<"uuid">>(),
      teacher_id: teacher.id,
      method_id: typia.random<string & tags.Format<"uuid">>(),
      code_id: null,
      checked_at: new Date().toISOString(),
      status: "present",
      exception_reason: null,
    }
  });
  typia.assert(attendanceRecord);

  // 3. 출석 이상 로그 생성 (출석레코드, 학생 FK, 정상 타입/규칙/상태로 연결)
  const abnormalLog = await api.functional.attendance.stats.abnormalLogs.post(connection, {
    body: {
      attendance_record_id: attendanceRecord.id,
      student_id: attendanceRecord.student_id,
      anomaly_type: "late",
      anomaly_rule: "random_rule_tag",
      status: "open",
      occurred_at: new Date().toISOString(),
    }
  });
  typia.assert(abnormalLog);

  // 4. PUT 정상 - 상태, 담당자, 해결시각 수정
  const updateInput = {
    status: "closed",
    admin_id: teacher.id,
    resolved_at: new Date().toISOString(),
  } satisfies IAttendanceStatsAbnormalLog.IUpdate;
  const updated = await api.functional.attendance.stats.abnormalLogs.putById(connection, {
    id: abnormalLog.id,
    body: updateInput,
  });
  typia.assert(updated);
  TestValidator.equals("상태, 담당자, 해결시각 반영")([updated.status, updated.admin_id, updated.resolved_at])([updateInput.status, updateInput.admin_id, updateInput.resolved_at]);
  // updated_at이 변경/created_at은 동일
  TestValidator.notEquals("updated_at이 변경됨")(updated.updated_at)(abnormalLog.updated_at);
  TestValidator.equals("created_at 동일")(updated.created_at)(abnormalLog.created_at);

  // 5. 존재하지 않는 ID로 수정하면 404
  await TestValidator.error("존재하지 않는 ID 수정시 404")(() =>
    api.functional.attendance.stats.abnormalLogs.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: updateInput,
    })
  );

  // 6. FK 위반(admin_id 오류/실제로 없는 UUID)로 422
  await TestValidator.error("잘못된 admin_id로 422")(() =>
    api.functional.attendance.stats.abnormalLogs.putById(connection, {
      id: abnormalLog.id,
      body: {
        ...updateInput,
        admin_id: typia.random<string & tags.Format<"uuid">>()
      },
    })
  );
  // 7. 권한부족(403) 체크는 전용 인증/스위칭 API 부재로 본 테스트에선 스킵
}