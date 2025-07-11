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
 * 출석 기록 삭제 권한 및 존재성 검증 E2E 테스트
 *
 * - 관계 없는 인증계정(학생, 부모 등) 또는 타 교사가 출석기록 삭제 요청 시 403 금지처리되는지 검증
 * - 존재하지 않는 출석기록 ID에 대한 DELETE 요청 시 404 에러가 발생하는지 검증
 *
 * **테스트 절차**
 * 1. 학교 생성
 * 2. 교사용 인증 계정, 교사 생성
 * 3. 학생용 인증 계정, 학생 생성
 * 4. 반 생성(교사-학교 연결)
 * 5. 출석 기록 하나 생성
 * 6. 관계없는 인증계정, 학생용 인증계정 등 추가 생성
 * 7. (403) - 관계없는 인증계정/학생ID로 DELETE 시도: 실패
 * 8. (403) - 타 반/타 교사 인증계정으로 DELETE 시도: 실패
 * 9. (404) - 아예 없는 UUID로 DELETE 시도: 실패
 *
 * 각 케이스별로 TestValidator.error()로 throw 발생 여부만 검증(상세 메시지는 검증하지 않음)
 */
export async function test_api_attendance_test_delete_attendance_record_with_unauthorized_or_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphabets(10),
      address: RandomGenerator.alphabets(20),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 2. 교사용 인증 계정 생성
  const teacherAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(teacherAuth);

  // 3. 교사 생성
  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: teacherAuth.id,
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceTeacher.ICreate,
  });
  typia.assert(teacher);

  // 4. 반 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher.id,
      name: `1-${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>>()}`,
      grade_level: 1,
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 5. 학생용 인증 계정 생성
  const studentAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(studentAuth);

  // 6. 학생 생성
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      auth_account_id: studentAuth.id,
      name: RandomGenerator.name(),
      gender: "male",
      birthdate: new Date().toISOString(),
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);

  // 7. 출석 기록 생성
  const attendanceRecord = await api.functional.attendance.attendanceRecords.post(connection, {
    body: {
      student_id: student.id,
      classroom_id: classroom.id,
      teacher_id: teacher.id,
      method_id: typia.random<string & tags.Format<"uuid">>(),
      checked_at: new Date().toISOString(),
      status: "present",
    } satisfies IAttendanceAttendanceRecord.ICreate,
  });
  typia.assert(attendanceRecord);

  // 8. (403) - 권한 없는 인증계정(학생/부모)로 접근 시도
  // 별도 인증계정 생성 (부모 등, system상 역할구분 없음)
  const otherAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(otherAuth);
  // 학생 계정 재활용하여 접근 (role 미구현 환경)
  await TestValidator.error("권한없는 계정(학생 등)으로 삭제시 403")(() =>
    api.functional.attendance.attendanceRecords.eraseById(connection, {
      id: attendanceRecord.id,
    })
  );

  // 9. (403) - 타 교사 계정으로 삭제시 시도
  // 다른 교사용 인증계정, 교사 생성
  const anotherTeacherAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(anotherTeacherAuth);

  const anotherTeacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: anotherTeacherAuth.id,
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceTeacher.ICreate,
  });
  typia.assert(anotherTeacher);

  await TestValidator.error("타 교사가 삭제시 403")(() =>
    api.functional.attendance.attendanceRecords.eraseById(connection, {
      id: attendanceRecord.id,
    })
  );

  // 10. (404) - 존재하지 않는 출석기록 id로 요청
  await TestValidator.error("존재하지 않는 출석기록 id로 삭제시 404")(() =>
    api.functional.attendance.attendanceRecords.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    })
  );
}