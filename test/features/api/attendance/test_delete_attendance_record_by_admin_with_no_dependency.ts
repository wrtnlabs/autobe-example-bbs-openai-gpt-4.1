import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceRecord";

/**
 * [관리자 권한으로 의존 데이터가 없는 출석 기록 삭제 E2E 테스트]
 *
 * - 출석 기록이 DB에서 정상적으로 삭제(204)되고, 추가 조회가 불가함을 검증
 * - 의존 데이터(통계/알림/연계 등)가 없는 경우 정상 삭제됨을 확인
 * - 의존 데이터가 있을 때 409 등 정책 오류가 반환되는 여부도 점검(단, 실제 API로 해당 상황 구성 불가하면 생략)
 *
 * [실행절차]
 * 1. 관리자 인증 계정 생성
 * 2. 학교 등록
 * 3. 교사 계정 및 교사 엔티티 생성
 * 4. 반(학급) 생성
 * 5. 학생 인증/등록
 * 6. 출석 기록 생성(최소 필수 데이터만 사용해 의존성 없이 생성)
 * 7. 출석 기록 삭제(정상 케이스)
 * 8. (조회 API 없으면 생략) - 삭제 후 조회 불가 여부 체크
 * 9. (정책적으로 필요한 경우) 의존 데이터 있을 때의 삭제 불가 케이스(409) 보장 시도, 단 제공 API 없으면 생략
 */
export async function test_api_attendance_test_delete_attendance_record_by_admin_with_no_dependency(
  connection: api.IConnection,
) {
  // 1. 관리자 인증 계정 생성
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: adminEmail,
      password_hash: RandomGenerator.alphabets(20),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(adminAccount);

  // 2. 학교 등록
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphaNumeric(6),
      address: RandomGenerator.alphaNumeric(20),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 교사 계정 및 교사 생성
  const teacherAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphabets(16),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(teacherAccount);

  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: teacherAccount.id,
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceTeacher.ICreate,
  });
  typia.assert(teacher);

  // 4. 반(학급) 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher.id,
      name: RandomGenerator.alphaNumeric(3),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 5. 학생 인증/등록
  const studentAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphabets(16),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(studentAccount);

  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      auth_account_id: studentAccount.id,
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male","female"]),
      birthdate: typia.random<string & tags.Format<"date-time">>(),
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);

  // 6. 출석 기록 생성 (의존 데이터 없는 상태에서 생성)
  const attendanceRecord = await api.functional.attendance.attendanceRecords.post(connection, {
    body: {
      student_id: student.id,
      classroom_id: classroom.id,
      teacher_id: teacher.id,
      method_id: typia.random<string & tags.Format<"uuid">>(),
      checked_at: typia.random<string & tags.Format<"date-time">>(),
      status: RandomGenerator.pick(["present","late","absent"]),
    } satisfies IAttendanceAttendanceRecord.ICreate,
  });
  typia.assert(attendanceRecord);

  // 7. 출석 기록 삭제(정상 케이스: 의존 데이터 없는 경우 204 반환)
  await api.functional.attendance.attendanceRecords.eraseById(connection, {
    id: attendanceRecord.id,
  });

  // 8. (조회 API 미제공이므로 출석 기록 삭제 후 조회 불가 여부는 생략)

  // 9. (추후: 의존 데이터가 있을 때 삭제 시도 시 409 오류 발생여부 검증을 시행하려면 해당 시나리오/데이터/엔드포인트 제공 필요. 현재 커버 불가이므로 생략)
}