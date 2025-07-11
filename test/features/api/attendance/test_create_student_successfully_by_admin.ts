import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 관리자 계정에서 학생 신규 등록 시나리오 E2E 테스트
 *
 * 1. 학교 정보를 신규 등록한다.
 * 2. 학생용, 부모(보호자)용 인증 계정 2개를 각각 생성한다.
 * 3. 부모(보호자) 엔티티를 생성한다(인증 계정 연결).
 * 4. 신규 담임 교사 인증 계정도 생성한다(반 생성 목적).
 * 5. 교사/학교 정보로 반(classroom)을 생성한다.
 * 6. 학생을 신규 등록한다(parent_id 포함).
 * 7. 반환된 학생 정보의 모든 필드/참조 값이 입력값대로 생성/매핑됐는지 검증한다.
 */
export async function test_api_attendance_test_create_student_successfully_by_admin(
  connection: api.IConnection,
) {
  // 1. 학교 데이터 등록
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name() + "초등학교",
      address: RandomGenerator.paragraph()(1),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 2. 학생용 인증 계정 생성
  const authStudent = await api.functional.attendance.auth.accounts.post(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
      } satisfies IAttendanceAuthAccount.ICreate,
    },
  );
  typia.assert(authStudent);

  // 3. 부모용 인증 계정 생성
  const authParent = await api.functional.attendance.auth.accounts.post(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
      } satisfies IAttendanceAuthAccount.ICreate,
    },
  );
  typia.assert(authParent);

  // 4. 부모(보호자) 등록
  const parent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: authParent.id,
      name: RandomGenerator.name(),
      email: authParent.email ?? typia.random<string & tags.Format<"email">>(),
      phone: "010" + typia.random<string>().slice(0, 8),
    } satisfies IAttendanceParent.ICreate,
  });
  typia.assert(parent);

  // 5. 신규 담임 교사 인증 계정 생성(교사 id만 필요)
  const authTeacher = await api.functional.attendance.auth.accounts.post(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
      } satisfies IAttendanceAuthAccount.ICreate,
    },
  );
  typia.assert(authTeacher);
  const teacherId = authTeacher.id;

  // 6. 반 생성
  const classroomName = RandomGenerator.alphaNumeric(3) + "반";
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherId,
      name: classroomName,
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 7. 학생 신규 등록
  const studentName = RandomGenerator.name();
  const studentGender: "male" | "female" = RandomGenerator.pick(["male", "female"]);
  const studentBirth = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 10).toISOString();
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      parent_id: parent.id,
      auth_account_id: authStudent.id,
      name: studentName,
      gender: studentGender,
      birthdate: studentBirth,
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);

  // 8. 반환 데이터 및 매핑 정상 검증
  TestValidator.equals("학생 school_id 매핑")(student.school_id)(school.id);
  TestValidator.equals("학생 classroom_id 매핑")(student.classroom_id)(classroom.id);
  TestValidator.equals("학생 parent_id 매핑")(student.parent_id)(parent.id);
  TestValidator.equals("학생 name 일치")(student.name)(studentName);
  TestValidator.equals("학생 gender 일치")(student.gender)(studentGender);
  TestValidator.equals("학생 birthdate 일치")(student.birthdate)(studentBirth);
  TestValidator.equals("학생 인증계정 연결")(student.auth_account_id)(authStudent.id);
}