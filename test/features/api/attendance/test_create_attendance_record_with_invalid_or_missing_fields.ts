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
 * /attendance/attendanceRecords 출석 기록 등록 API의 유효성/실패 시나리오 검증
 *
 * - 학교, 인증계정, 교사, 반, 학생 등 모든 정상 참조 데이터를 준비한 후,
 *   출석 기록 등록 시 "존재하지 않는 FK", 중복 unique, enum 허용값 위반 등의 입력을 전달할 때
 *   서버에서 422/409 등 적합한 오류가 실제로 반환되는지 검증한다.
 * - TypeScript 타입(컴파일) 오류를 유발하는 테스트(필수필드 누락, checked_at 타입 위반 등)는 구현하지 않는다.
 *
 * 테스트 흐름:
 * 1. 신규 학교, 인증계정, 교사, 반, 학생을 생성해 모든 정상 FK 참조 값을 준비한다.
 * 2. 정상 데이터로 출석기록 1건을 등록(정상 동작)
 * 3. FK 입력값에 대해 존재하지 않는 UUID를 할당하여 각각 student_id/classroom_id/teacher_id/method_id 오류 케이스 검증
 * 4. status 값에 임의(비허용) 문자열을 넣어 enum 위반 유효성 검증
 * 5. 이미 등록된 (student_id/classroom_id/checked_at) 중복 unique 조합으로 요청 시 409 중복 오류 검증
 */
export async function test_api_attendance_test_create_attendance_record_with_invalid_or_missing_fields(
  connection: api.IConnection,
) {
  // 1. 정상 참조 데이터 준비 (학교, 계정, 교사, 반, 학생)
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphabets(10),
      address: RandomGenerator.alphabets(40),
    },
  });
  typia.assert(school);

  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(64),
    },
  });
  typia.assert(account);

  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: account.id,
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(teacher);

  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher.id,
      name: RandomGenerator.alphabets(4),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    },
  });
  typia.assert(classroom);

  const studentAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(64),
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
      birthdate: new Date("2012-04-01T09:00:00Z").toISOString(),
    },
  });
  typia.assert(student);

  // 2. 정상 데이터로 출석기록 1건 등록 (동일 조합 중복 검증 위해 필요)
  const now = new Date().toISOString();
  const validBody = {
    student_id: student.id,
    classroom_id: classroom.id,
    teacher_id: teacher.id,
    method_id: typia.random<string & tags.Format<"uuid">>(), // 실서비스 환경에서는 실제 등록된 값 필요
    code_id: null,
    checked_at: now,
    status: "present",
    exception_reason: null,
  } satisfies IAttendanceAttendanceRecord.ICreate;

  const attendance = await api.functional.attendance.attendanceRecords.post(connection, {
    body: validBody,
  });
  typia.assert(attendance);

  // 3. 존재하지 않는 student_id로 등록 시 422/409 등 적합한 FK 오류 발생 검증
  await TestValidator.error("존재하지 않는 student_id 실패")(() =>
    api.functional.attendance.attendanceRecords.post(connection, {
      body: { ...validBody, student_id: typia.random<string & tags.Format<"uuid">>() },
    }),
  );

  // 4. 존재하지 않는 classroom_id 오류 검증
  await TestValidator.error("존재하지 않는 classroom_id 실패")(() =>
    api.functional.attendance.attendanceRecords.post(connection, {
      body: { ...validBody, classroom_id: typia.random<string & tags.Format<"uuid">>() },
    }),
  );

  // 5. 존재하지 않는 teacher_id 오류 검증
  await TestValidator.error("존재하지 않는 teacher_id 실패")(() =>
    api.functional.attendance.attendanceRecords.post(connection, {
      body: { ...validBody, teacher_id: typia.random<string & tags.Format<"uuid">>() },
    }),
  );

  // 6. 존재하지 않는 method_id 오류 검증
  await TestValidator.error("존재하지 않는 method_id 실패")(() =>
    api.functional.attendance.attendanceRecords.post(connection, {
      body: { ...validBody, method_id: typia.random<string & tags.Format<"uuid">>() },
    }),
  );

  // 7. status에 임의 문자열을 넣어 enum/validation 위반 실패
  await TestValidator.error("status에 허용되지 않은 값 전달 시 422 실패")(() =>
    api.functional.attendance.attendanceRecords.post(connection, {
      body: { ...validBody, status: "notavalidstatus" },
    }),
  );

  // 8. 이미 등록된 값으로 동일 데이터 재등록 시, 중복 unique 409 오류 검증
  await TestValidator.error("동일 값 중복 등록시 409 unique 오류")(() =>
    api.functional.attendance.attendanceRecords.post(connection, {
      body: { ...validBody },
    }),
  );
}