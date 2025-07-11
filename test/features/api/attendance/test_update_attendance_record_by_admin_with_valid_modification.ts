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
 * 관리자 또는 교사 권한으로 출석 기록(AttendanceAttendanceRecord)을 정상적으로 수정하는 시나리오를 검증합니다.
 * 
 * 이 테스트는 성공 케이스(올바른 참조/값으로 출석 기록 업데이트)와, 실패 케이스(존재하지 않는 학생/반/교사 ID, 잘못된 상태값 등으로 인한 422/409/외래키 예외)를 모두 포함합니다.
 * 실행 전, school/teacher/classroom/student/authAccount 생성 후, 초기 출석 기록을 먼저 insert 한 뒤 그 레코드를 대상으로 수정 테스트를 진행합니다.
 *
 * [테스트 시나리오]
 * 1. 인증 계정 생성 (admin 또는 teacher)
 * 2. 학교 데이터 생성
 * 3. 교사 생성(teacher - 위에서 만든 authAccount, school_id와 연계)
 * 4. 반(classroom) 생성(teacher와 school_id 연동)
 * 5. 학생 계정 및 student 엔터티 생성(classroom, school, authAccount FK 사용)
 * 6. 출석 기록(AttendanceAttendanceRecord) 초기 insert
 * 7. 정상 데이터로 해당 출석 기록 수정(상태, 메소드, 코드 등 일부 변경)
 *  - 변경 반영 여부 및 반환값 검증
 * 8. 비정상 데이터(존재하지 않는 참조/유효하지 않은 값 등)로 수정 요청시 409/422 등 에러 발생 확인
 */
export async function test_api_attendance_test_update_attendance_record_by_admin_with_valid_modification(
  connection: api.IConnection,
) {
  // 1. 인증 계정 생성 - 교사용
  const teacherAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashed-pw-1",
    },
  });
  typia.assert(teacherAccount);

  // 2. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: `테스트학교-${RandomGenerator.alphabets(8)}`,
      address: `서울 특별시 강남구 테헤란로 ${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>>()}길`,
    },
  });
  typia.assert(school);

  // 3. 교사 생성
  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: teacherAccount.id,
      name: RandomGenerator.name(),
      email: teacherAccount.email!,
      phone: "010-9999-2222",
    },
  });
  typia.assert(teacher);

  // 4. 반 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher.id,
      name: "1-1",
      grade_level: 1,
    },
  });
  typia.assert(classroom);

  // 5. 학생용 인증계정 및 학생 엔터티 생성
  const studentAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashed-pw-2",
    },
  });
  typia.assert(studentAccount);

  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      auth_account_id: studentAccount.id,
      name: RandomGenerator.name(),
      gender: "male",
      birthdate: new Date().toISOString(),
    },
  });
  typia.assert(student);

  // 6. 출석 기록 생성 (초기 insert)
  const attendanceMethodId = typia.random<string & tags.Format<"uuid">>();
  const attendanceCodeId = typia.random<string & tags.Format<"uuid">>();
  const attendanceRecord = await api.functional.attendance.attendanceRecords.post(connection, {
    body: {
      student_id: student.id,
      classroom_id: classroom.id,
      teacher_id: teacher.id,
      method_id: attendanceMethodId,
      code_id: attendanceCodeId,
      checked_at: new Date().toISOString(),
      status: "present",
      exception_reason: null,
    },
  });
  typia.assert(attendanceRecord);

  // 7. 정상 수정 (상태, 메소드, 코드 변경)
  const modifiedAttendanceRecord = await api.functional.attendance.attendanceRecords.putById(connection, {
    id: attendanceRecord.id,
    body: {
      student_id: student.id,
      classroom_id: classroom.id,
      teacher_id: teacher.id,
      method_id: typia.random<string & tags.Format<"uuid">>(), // 새로운 메소드 ID로 변경
      code_id: typia.random<string & tags.Format<"uuid">>(), // 새로운 코드 ID로 변경
      checked_at: new Date().toISOString(),
      status: "late",
      exception_reason: "지각 사유 테스트",
    },
  });
  typia.assert(modifiedAttendanceRecord);
  // 변경 내용이 반영되었는지 검증
  TestValidator.equals("출석 상태 변경 여부")(modifiedAttendanceRecord.status)("late");
  TestValidator.equals("exception_reason 반영 여부")(modifiedAttendanceRecord.exception_reason)("지각 사유 테스트");

  // 8. 유효하지 않은 값(존재하지 않는 참조) - 에러 발생 검증 (studentId 오류)
  await TestValidator.error("존재하지 않는 학생 ID로 수정 시 오류")(
    async () => {
      await api.functional.attendance.attendanceRecords.putById(connection, {
        id: attendanceRecord.id,
        body: {
          ...modifiedAttendanceRecord,
          student_id: typia.random<string & tags.Format<"uuid">>(),
        },
      });
    },
  );
  // 8-2. 유효하지 않은 값(존재하지 않는 교사 ID) - 에러 발생 검증
  await TestValidator.error("존재하지 않는 교사 ID로 수정 시 오류")(
    async () => {
      await api.functional.attendance.attendanceRecords.putById(connection, {
        id: attendanceRecord.id,
        body: {
          ...modifiedAttendanceRecord,
          teacher_id: typia.random<string & tags.Format<"uuid">>(),
        },
      });
    },
  );
  // 8-3. 유효하지 않은 값(존재하지 않는 반 ID) - 에러 발생 검증
  await TestValidator.error("존재하지 않는 반 ID로 수정 시 오류")(
    async () => {
      await api.functional.attendance.attendanceRecords.putById(connection, {
        id: attendanceRecord.id,
        body: {
          ...modifiedAttendanceRecord,
          classroom_id: typia.random<string & tags.Format<"uuid">>(),
        },
      });
    },
  );
  // 8-4. 유효하지 않은 값(존재하지 않는 method ID) - 에러 발생 검증
  await TestValidator.error("존재하지 않는 method ID로 수정 시 오류")(
    async () => {
      await api.functional.attendance.attendanceRecords.putById(connection, {
        id: attendanceRecord.id,
        body: {
          ...modifiedAttendanceRecord,
          method_id: typia.random<string & tags.Format<"uuid">>(),
        },
      });
    },
  );
}