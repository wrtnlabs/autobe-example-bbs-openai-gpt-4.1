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
 * 교사 계정으로 출석 기록을 정상적으로 생성하는 것을 검증합니다.
 *
 * - 출석 기록을 위해 학교, 교사 계정, 교사 프로필, 반, 학생 등 모든 엔터티가 선행 생성되어야 하며,
 *   각 엔터티 간 외래키 관계 및 식별자 참조가 정확히 이루어져야 합니다.
 * - 출석 기록 생성 시 필수값(학생ID, 교사ID, 반ID, 출석방법ID, 코드ID/상태 등)이 정상적으로 반영되어 반환 데이터를 통해 검증해야 합니다.
 * - 코드ID 필드를 직접 입력하는 경우에도 저장이 정상적으로 되는지 확인해야 합니다.
 * - 동일 학생, 동일 시각, 동일 반에 출석기록을 중복 입력시 409 에러(중복)에러가 발생함을 검증하는 것도 필수입니다.
 *
 * 1. 학교 등록
 * 2. 교사 인증계정 생성
 * 3. 교사 프로필 등록 (학교, 계정 연결)
 * 4. 반 생성 (해당 교사-학교 기준)
 * 5. 학생 인증계정/등록 (학교-반 연결)
 * 6. 출석 기록을 method/code/status 모든 필드를 채워 교사 계정으로 생성하고, 반환 객체가 입력값과 정확히 일치하는지 검증
 * 7. 같은 학생-반-시간(checked_at)으로 같은 출석 기록을 다시 입력할 때 409 중복에러 발생을 검증
 */
export async function test_api_attendance_test_create_attendance_record_as_teacher_with_valid_data(
  connection: api.IConnection,
) {
  // 1. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.paragraph()(6),
      address: `${RandomGenerator.paragraph()(2)} ${RandomGenerator.paragraph()(3)}`,
    },
  });
  typia.assert(school);

  // 2. 교사 인증계정 생성
  const teacherEmail = typia.random<string & tags.Format<"email">>();
  const teacherPassword = "testpass1234";
  const teacherAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: teacherEmail,
      password_hash: teacherPassword,
    },
  });
  typia.assert(teacherAccount);

  // 3. 교사 프로필 생성
  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: teacherAccount.id,
      name: RandomGenerator.name(),
      email: teacherEmail,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(teacher);

  // 4. 반 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher.id,
      name: RandomGenerator.alphabets(4),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    },
  });
  typia.assert(classroom);

  // 5. 학생 인증계정/등록
  const studentEmail = typia.random<string & tags.Format<"email">>();
  const studentAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: studentEmail,
      password_hash: "studentpass!@#",
    },
  });
  typia.assert(studentAccount);

  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      auth_account_id: studentAccount.id,
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: typia.random<string & tags.Format<"date-time">>(),
    },
  });
  typia.assert(student);

  // 6. 출석 기록 생성 (method_id, code_id, status, checked_at 등 명시)
  const sample_method_id = typia.random<string & tags.Format<"uuid">>();
  const sample_code_id = typia.random<string & tags.Format<"uuid">>();
  const checked_at = new Date().toISOString();
  const status = RandomGenerator.pick(["present", "late", "absent", "leave"]);
  const exception_reason = status !== "present" ? RandomGenerator.paragraph()(2) : null;
  const attendanceInput = {
    student_id: student.id,
    classroom_id: classroom.id,
    teacher_id: teacher.id,
    method_id: sample_method_id,
    code_id: sample_code_id,
    checked_at,
    status,
    exception_reason,
  } satisfies IAttendanceAttendanceRecord.ICreate;

  const attendanceRecord = await api.functional.attendance.attendanceRecords.post(connection, {
    body: attendanceInput,
  });
  typia.assert(attendanceRecord);
  // 입력 값과 반환 값 비교
  TestValidator.equals("출석기록 전체정보는 입력값과 동일해야 함")(attendanceRecord.student_id)(attendanceInput.student_id);
  TestValidator.equals("반 ID 동일")(attendanceRecord.classroom_id)(attendanceInput.classroom_id);
  TestValidator.equals("교사 ID 동일")(attendanceRecord.teacher_id)(attendanceInput.teacher_id);
  TestValidator.equals("출석방법 ID 동일")(attendanceRecord.method_id)(attendanceInput.method_id);
  TestValidator.equals("출석코드 ID 동일")(attendanceRecord.code_id)(attendanceInput.code_id);
  TestValidator.equals("출석 시각 동일")(attendanceRecord.checked_at)(attendanceInput.checked_at);
  TestValidator.equals("상태 동일")(attendanceRecord.status)(attendanceInput.status);
  TestValidator.equals("예외사유 동일")(attendanceRecord.exception_reason)(attendanceInput.exception_reason);

  // 7. 동일 학생-반-시각 중복 입력 시 409 에러 검증
  await TestValidator.error("동일한 학생/반/시각 중복 출석기록 409 에러")(async () => {
    await api.functional.attendance.attendanceRecords.post(connection, {
      body: attendanceInput,
    });
  });
}