import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IPageAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceStudent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 출석 학생 목록의 필터(학급, 부모, 이름), 검색, 페이징 기능 E2E 테스트.
 *
 * 관리자/교사 권한 계정이 출석 시스템 내에서 학교, 반, 학부모, 학생 정보를 복수로 등록한 뒤,
 * 학생 목록을 다양한 조건(학급, 부모, 이름 키워드, 페이지네이션 등)으로 조회하여, 실제로 각 필터와 페이징, 응답 메타 정보가 정상 동작하는지 검증한다.
 *
 * 상세 검증 항목:
 *  1. 관리자 계정/학교/교사/반/학부모/학생 데이터 준비
 *  2. 학교 전체 학생 페이징(2건씩, 여러 페이지)
 *  3. 특정 반 학생만 필터
 *  4. 특정 부모의 자녀만 필터
 *  5. 이름 키워드(중복) 검색
 *  6. 없는 키워드로 검색 시 빈 결과
 */
export async function test_api_attendance_test_list_students_with_various_filters(
  connection: api.IConnection,
) {
  // 1. 관리자 인증 계정 생성
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: adminEmail,
      password_hash: RandomGenerator.alphaNumeric(48)
    } satisfies IAttendanceAuthAccount.ICreate
  });
  typia.assert(adminAccount);

  // 2. 학교 등록
  const schoolName = RandomGenerator.alphabets(8);
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: schoolName,
      address: RandomGenerator.paragraph()()
    } satisfies IAttendanceSchool.ICreate
  });
  typia.assert(school);

  // 3. 교사 인증계정/등록 2명
  const teacher1Acc = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(48)
    } satisfies IAttendanceAuthAccount.ICreate
  });
  typia.assert(teacher1Acc);
  const teacher2Acc = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(48)
    } satisfies IAttendanceAuthAccount.ICreate
  });
  typia.assert(teacher2Acc);
  const teacher1 = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: teacher1Acc.id,
      name: RandomGenerator.name(),
      email: teacher1Acc.email!,
      phone: RandomGenerator.mobile()
    } satisfies IAttendanceTeacher.ICreate
  });
  typia.assert(teacher1);
  const teacher2 = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: teacher2Acc.id,
      name: RandomGenerator.name(),
      email: teacher2Acc.email!,
      phone: RandomGenerator.mobile()
    } satisfies IAttendanceTeacher.ICreate
  });
  typia.assert(teacher2);

  // 4. 반 2개 생성
  const classroom1 = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher1.id,
      name: "1-1",
      grade_level: 1
    } satisfies IAttendanceClassroom.ICreate
  });
  typia.assert(classroom1);
  const classroom2 = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher2.id,
      name: "1-2",
      grade_level: 1
    } satisfies IAttendanceClassroom.ICreate
  });
  typia.assert(classroom2);

  // 5. 학부모 인증 및 부모 등록 3명
  const parent1Acc = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(48)
    } satisfies IAttendanceAuthAccount.ICreate
  });
  typia.assert(parent1Acc);
  const parent2Acc = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(48)
    } satisfies IAttendanceAuthAccount.ICreate
  });
  typia.assert(parent2Acc);
  const parent3Acc = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(48)
    } satisfies IAttendanceAuthAccount.ICreate
  });
  typia.assert(parent3Acc);
  const parent1 = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: parent1Acc.id,
      name: RandomGenerator.name(),
      email: parent1Acc.email!,
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceParent.ICreate
  });
  typia.assert(parent1);
  const parent2 = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: parent2Acc.id,
      name: RandomGenerator.name(),
      email: parent2Acc.email!,
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceParent.ICreate
  });
  typia.assert(parent2);
  const parent3 = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: parent3Acc.id,
      name: RandomGenerator.name(),
      email: parent3Acc.email!,
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceParent.ICreate
  });
  typia.assert(parent3);

  // 6. 학생 6명 생성(반/부모/이름/성별 조합 다르게)
  const studentAccounts = await ArrayUtil.asyncRepeat(6)(async () =>
    api.functional.attendance.auth.accounts.post(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(48)
      } satisfies IAttendanceAuthAccount.ICreate
    })
  );
  const studentDefs = [
    { classroom_id: classroom1.id, parent_id: parent1.id, name: "홍길동A", gender: "male" as const },
    { classroom_id: classroom1.id, parent_id: parent2.id, name: "김철수", gender: "male" as const },
    { classroom_id: classroom2.id, parent_id: parent1.id, name: "김철수", gender: "male" as const },
    { classroom_id: classroom2.id, parent_id: parent3.id, name: "이영희B", gender: "female" as const },
    { classroom_id: classroom2.id, parent_id: parent2.id, name: "박해성C", gender: "male" as const },
    { classroom_id: classroom1.id, parent_id: parent3.id, name: "최지훈D", gender: "female" as const },
  ];
  const students = [];
  for (let i = 0; i < 6; ++i) {
    const account = studentAccounts[i];
    const def = studentDefs[i];
    const student = await api.functional.attendance.students.post(connection, {
      body: {
        school_id: school.id,
        classroom_id: def.classroom_id,
        parent_id: def.parent_id,
        auth_account_id: account.id,
        name: def.name,
        gender: def.gender,
        birthdate: new Date(2014,0,1+i).toISOString()
      } satisfies IAttendanceStudent.ICreate
    });
    typia.assert(student);
    students.push(student);
  }

  // 7. 전체 학생 페이징(2건씩, 페이지 이동)
  const studentsPage1 = await api.functional.attendance.students.patch(connection, {
    body: {
      school_id: school.id,
      page: 1,
      limit: 2
    } satisfies IAttendanceStudent.IRequest
  });
  typia.assert(studentsPage1);
  TestValidator.equals("첫 페이지 학생 수")(studentsPage1.data.length)(2);
  TestValidator.equals("현재 페이지")(studentsPage1.pagination.current)(1);

  const studentsPage2 = await api.functional.attendance.students.patch(connection, {
    body: {
      school_id: school.id,
      page: 2,
      limit: 2
    } satisfies IAttendanceStudent.IRequest
  });
  typia.assert(studentsPage2);
  TestValidator.equals("둘째 페이지 학생 수")(studentsPage2.data.length)(2);

  // 8. 특정 반(classroom1.id)로 필터
  const classroom1Students = await api.functional.attendance.students.patch(connection, {
    body: {
      classroom_id: classroom1.id
    } satisfies IAttendanceStudent.IRequest
  });
  typia.assert(classroom1Students);
  TestValidator.predicate("classroom1 학생 3명")(classroom1Students.data.length === 3);
  classroom1Students.data.forEach(s =>
    TestValidator.equals("소속 학급")(s.classroom_id)(classroom1.id));

  // 9. 특정 부모(parent2.id) 필터
  const parent2Students = await api.functional.attendance.students.patch(connection, {
    body: {
      parent_id: parent2.id
    } satisfies IAttendanceStudent.IRequest
  });
  typia.assert(parent2Students);
  const parent2Count = students.filter(s => s.parent_id === parent2.id).length;
  TestValidator.equals("parent2 자녀 수")(parent2Students.data.length)(parent2Count);
  parent2Students.data.forEach(s =>
    TestValidator.equals("학생 parent id")(s.parent_id)(parent2.id));

  // 10. 이름 키워드(김철수) 검색으로 해당 학생들만 조회
  const keywordStudents = await api.functional.attendance.students.patch(connection, {
    body: {
      name: "김철수"
    } satisfies IAttendanceStudent.IRequest
  });
  typia.assert(keywordStudents);
  TestValidator.equals("김철수 학생수")(keywordStudents.data.length)(2);
  keywordStudents.data.forEach(s =>
    TestValidator.equals("이름 키워드 매칭")(s.name)("김철수"));

  // 11. 없는 이름 키워드 검색시 빈 배열
  const noneKeywordStudents = await api.functional.attendance.students.patch(connection, {
    body: {
      name: "존재하지않는이름"
    } satisfies IAttendanceStudent.IRequest
  });
  typia.assert(noneKeywordStudents);
  TestValidator.equals("없는 학생 결과")(noneKeywordStudents.data.length)(0);
}