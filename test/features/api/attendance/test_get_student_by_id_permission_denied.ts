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
 * 권한 없는 사용자(타 학교 교사, 타 학부모, 타 학생) 또는 미존재 학생 id로 상세 조회할 때 권한 거부(403) 또는 미존재(404) 오류가 반환되는지 검증한다.
 *
 * 이 테스트는 attendance 학생 상세조회 API(/attendance/students/{id})에 대해 다음과 같은 상황에서 오류 응답이 반환되는지 확인한다.
 *
 * 1. 여러 학교 데이터 생성
 * 2. 각 학교마다 학급 생성
 * 3. 교사, 학부모, 학생용 인증계정 다수 생성
 * 4. 타 학교 학생 및 학부모 엔터티 생성
 * 5. 각 권한 없는 계정이 본인과 관련 없는 학생 id로 상세조회 시도 (타 학교 교사, 타 학교 학부모, 타 학생)
 * 6. 존재하지 않는(랜덤 uuid) 학생 id로 조회 시도
 * 7. 각 케이스별로 403 또는 404 error가 발생함을 TestValidator.error로 검증
 */
export async function test_api_attendance_test_get_student_by_id_permission_denied(
  connection: api.IConnection,
) {
  // 1. 여러 학교 생성
  const schoolA = await api.functional.attendance.schools.post(connection, {
    body: {
      name: `테스트 학교A_${Date.now()}`,
      address: `서울시 강남구 진짜로 ${Date.now()}번길`
    },
  });
  typia.assert(schoolA);
  const schoolB = await api.functional.attendance.schools.post(connection, {
    body: {
      name: `테스트 학교B_${Date.now()}`,
      address: `서울시 서초구 리얼로 ${Date.now()}길`
    },
  });
  typia.assert(schoolB);

  // 2. 각 학교에 교사 인증계정 생성(teacher_id 용도), 실제 teacher 테이블 없이 uuid 대체
  const teacherAuthA = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: `teacherA_${Date.now()}@test.com`,
      password_hash: "hashed_pwA"
    },
  });
  typia.assert(teacherAuthA);
  const teacherAuthB = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: `teacherB_${Date.now()}@test.com`,
      password_hash: "hashed_pwB"
    },
  });
  typia.assert(teacherAuthB);

  // 3. 각 학교/교사별로 학급 생성
  const classroomA = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: schoolA.id,
      teacher_id: teacherAuthA.id,
      name: "1-1반",
      grade_level: 1,
    },
  });
  typia.assert(classroomA);
  const classroomB = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: schoolB.id,
      teacher_id: teacherAuthB.id,
      name: "1-1반",
      grade_level: 1,
    },
  });
  typia.assert(classroomB);

  // 4. 학부모 인증계정, 학생 인증계정 각각 생성
  const parentAuthA = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: `parentA_${Date.now()}@test.com`,
      password_hash: "parent_pwA"
    },
  });
  typia.assert(parentAuthA);
  const parentAuthB = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: `parentB_${Date.now()}@test.com`,
      password_hash: "parent_pwB"
    },
  });
  typia.assert(parentAuthB);
  const studentAuthA = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: `studentA_${Date.now()}@test.com`,
      password_hash: "student_pwA"
    },
  });
  typia.assert(studentAuthA);
  const studentAuthB = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: `studentB_${Date.now()}@test.com`,
      password_hash: "student_pwB"
    },
  });
  typia.assert(studentAuthB);

  // 5. 학부모(parent) 생성 (ParentA, ParentB)
  const parentA = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: parentAuthA.id,
      name: "엄마A",
      email: `parent_realA_${Date.now()}@test.com`,
      phone: "01011112222"
    },
  });
  typia.assert(parentA);
  const parentB = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: parentAuthB.id,
      name: "엄마B",
      email: `parent_realB_${Date.now()}@test.com`,
      phone: "01033334444"
    },
  });
  typia.assert(parentB);

  // 6. 학생A 생성 (학교A/교사A/학급A/부모A)
  const studentA = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: schoolA.id,
      classroom_id: classroomA.id,
      parent_id: parentA.id,
      auth_account_id: studentAuthA.id,
      name: "홍길동A",
      gender: "male",
      birthdate: new Date("2012-06-01T07:50:00.000Z").toISOString()
    },
  });
  typia.assert(studentA);
  // 7. 학생B 생성 (학교B/교사B/학급B/부모B)
  const studentB = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: schoolB.id,
      classroom_id: classroomB.id,
      parent_id: parentB.id,
      auth_account_id: studentAuthB.id,
      name: "홍길동B",
      gender: "female",
      birthdate: new Date("2013-05-15T07:30:00.000Z").toISOString()
    },
  });
  typia.assert(studentB);

  // =============== 오류 검증 케이스 BEGIN ===============
  // A. 타 학교 교사가 타 학생 상세조회 시도 (학교A 교사 -> 학생B 조회, 학교B 교사 -> 학생A 조회)
  await TestValidator.error("학교A 교사로 학교B 학생 상세조회시 권한 거부")(() =>
    api.functional.attendance.students.getById(connection, { id: studentB.id }),
  );
  await TestValidator.error("학교B 교사로 학교A 학생 상세조회시 권한 거부")(() =>
    api.functional.attendance.students.getById(connection, { id: studentA.id }),
  );

  // B. 타 학부모가 본인 자녀 아닌 학생 상세조회 시도 (parentA -> 학생B, parentB -> 학생A)
  await TestValidator.error("parentA로 학생B 상세조회시 권한 거부")(() =>
    api.functional.attendance.students.getById(connection, { id: studentB.id }),
  );
  await TestValidator.error("parentB로 학생A 상세조회시 권한 거부")(() =>
    api.functional.attendance.students.getById(connection, { id: studentA.id }),
  );

  // C. 타 학생 본인이 타 학생 상세조회 시도 (studentA -> 학생B, studentB -> 학생A)
  await TestValidator.error("studentA 계정으로 학생B 조회시 권한 거부")(() =>
    api.functional.attendance.students.getById(connection, { id: studentB.id }),
  );
  await TestValidator.error("studentB 계정으로 학생A 조회시 권한 거부")(() =>
    api.functional.attendance.students.getById(connection, { id: studentA.id }),
  );

  // D. 존재하지 않는 임의의 학생 id로 상세조회 시도
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("존재하지 않는 학생 id로 상세조회시 에러")(() =>
    api.functional.attendance.students.getById(connection, { id: invalidId }),
  );

  // =============== 오류 검증 케이스 END ===============
}