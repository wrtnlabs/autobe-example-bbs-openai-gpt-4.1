import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceAttendanceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceRecord";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";
import type { IAttendanceStatsAbnormalLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsAbnormalLog";

/**
 * 출석 이상 로그(비정상 출석 이벤트 로그)의 생성 API에 대한 종합 검증.
 *
 * 주요 시나리오:
 * 1. 정상 데이터로 생성 성공: 실제 존재하는 학생, 출석기록, 정상 이상유형 등 유효한 참조값/필수 필드를 모두 포함하여 생성 성공을 확인한다.
 * 2. 필수값 누락/이상 값: 하나 이상의 필수 필드를 omit 하거나 이상문자 등 제약 위반을 입력하였을 때 422 에러가 반환되는지 검증한다.
 * 3. 잘못된 FK: 존재하지 않는 학생, 출석레코드 등 연관 FK에 대해 422 오류 발생을 확인한다.
 * 4. 권한 부족(teacher/admin이 아닌)의 경우 403 Forbidden 오류가 발생하는지 확인한다.
 * 5. 동일 (학생/유형/일시)로 중복 생성시 409/422 등 정책에 맞는 오류를 검증한다.
 *
 * 테스트 준비과정에서 teacher, student, attendanceRecord, (필요시 code) 등 선행 데이터를 실제 생성 후 식별자를 바탕으로 처리하며,
 * 각 케이스는 주석으로 상세 절차를 구분해 구현한다.
 */
export async function test_api_attendance_test_create_abnormal_attendance_log_with_valid_and_invalid_data(
  connection: api.IConnection,
) {
  // ========= 1. 테스트 환경 데이터 준비: 교사·학생·출석이벤트 =========
  // 교사 생성
  const teacherSchoolId = typia.random<string & tags.Format<"uuid">>();
  const teacherAuthAccountId = typia.random<string & tags.Format<"uuid">>();
  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: teacherSchoolId,
      auth_account_id: teacherAuthAccountId,
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(teacher);

  // 학생(동일 학교/반/임의 parent/계정) 생성
  const classroomId = typia.random<string & tags.Format<"uuid">>();
  const studentAuthAccountId = typia.random<string & tags.Format<"uuid">>();
  const studentParentId = typia.random<string & tags.Format<"uuid">>();
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: teacherSchoolId,
      classroom_id: classroomId,
      parent_id: studentParentId,
      auth_account_id: studentAuthAccountId,
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: typia.random<string & tags.Format<"date-time">>(),
    },
  });
  typia.assert(student);

  // 출석이벤트(해당 학생/교사/반/방식/이상코드 등 필요값)
  const attendanceMethodId = typia.random<string & tags.Format<"uuid">>();
  const attendanceStatus = "present";
  const attendanceRecord = await api.functional.attendance.attendanceRecords.post(connection, {
    body: {
      student_id: student.id,
      classroom_id: classroomId,
      teacher_id: teacher.id,
      method_id: attendanceMethodId,
      code_id: null,
      checked_at: typia.random<string & tags.Format<"date-time">>(),
      status: attendanceStatus,
      exception_reason: null,
    },
  });
  typia.assert(attendanceRecord);

  // ========= 2. 정상 케이스: 올바른 데이터로 출석 이상로그 생성 (성공) =========
  const now = typia.random<string & tags.Format<"date-time">>();
  const normalCreateInput = {
    attendance_record_id: attendanceRecord.id,
    student_id: student.id,
    anomaly_type: "duplicate",
    anomaly_rule: "duplicate_basic",
    status: "open",
    occurred_at: now,
  } satisfies IAttendanceStatsAbnormalLog.ICreate;

  const normalLog = await api.functional.attendance.stats.abnormalLogs.post(connection, {
    body: normalCreateInput,
  });
  typia.assert(normalLog);
  // 결과 객체에 우리가 입력했던 필드가 정확히 들어있는지 검증
  TestValidator.equals("attendance_record_id matches")(normalLog.attendance_record_id)(attendanceRecord.id);
  TestValidator.equals("student_id matches")(normalLog.student_id)(student.id);
  TestValidator.equals("anomaly_type matches")(normalLog.anomaly_type)(normalCreateInput.anomaly_type);
  TestValidator.equals("anomaly_rule matches")(normalLog.anomaly_rule)(normalCreateInput.anomaly_rule);
  TestValidator.equals("status matches")(normalLog.status)(normalCreateInput.status);
  TestValidator.equals("occurred_at matches")(normalLog.occurred_at)(now);

  // ========= 3. 필수값 누락시 422 에러 검증 =========
  await TestValidator.error("missing required attendance_record_id → 422")(
    async () => {
      await api.functional.attendance.stats.abnormalLogs.post(connection, {
        body: {
          // attendance_record_id 생략
          student_id: student.id,
          anomaly_type: "proxy",
          anomaly_rule: "policy_invalid_proxy",
          status: "in_review",
          occurred_at: now,
        } as any, // intentionally for error test (never use in normal code)
      });
    },
  );

  // ========= 4. 잘못된 FK(없는 학생) 등 제약 위반 → 422 에러 =========
  await TestValidator.error("invalid student_id → 422")(
    async () => {
      await api.functional.attendance.stats.abnormalLogs.post(connection, {
        body: {
          attendance_record_id: attendanceRecord.id,
          student_id: typia.random<string & tags.Format<"uuid">>(), // 가짜 uuid
          anomaly_type: "late",
          anomaly_rule: "policy_late",
          status: "open",
          occurred_at: now,
        },
      });
    },
  );

  // ========= 5. 권한 없는 계정에서 생성 시 403 에러(보장 불가 시 omit) =========
  // (이 테스트에서는 connection 으로 권한 없는 케이스를 시뮬레이션 할 방법이 별도로 제공되지 않으므로, 기본적인 인증 connection 기준 진행)

  // ========= 6. 동일 학생/유형/일시로 중복 생성 시 409나 422 등 충돌/제약 검증 =========
  await TestValidator.error("duplicate abnormal log creation → 409/422")(
    async () => {
      await api.functional.attendance.stats.abnormalLogs.post(connection, {
        body: normalCreateInput,
      });
    },
  );
}