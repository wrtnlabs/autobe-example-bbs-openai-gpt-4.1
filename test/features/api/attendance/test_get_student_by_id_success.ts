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
 * 학생 상세 정보 조회 성공 테스트
 *
 * 이 테스트는 적합한 권한을 가진 사용자(어드민, 교사, 학부모-본인자녀, 학생 본인)가 등록된 학생 UUID로
 * GET /attendance/students/{id} 엔드포인트를 호출할 때, 학생 상세 정보(프로필, 학부모, 학급 등)가
 * 정상적으로 반환되는지 검증한다.
 *
 * [테스트 시나리오]
 * 1. 학교 정보를 등록한다
 * 2. 학생, 학부모용 인증 계정 2개를 생성한다
 * 3. 학부모 정보를 생성한다 (학부모 인증계정 이용)
 * 4. 임시 담임교사 UUID를 생성한다(엔티티 직접 생성은 불가하므로 임의값)
 * 5. 위 학교/담임 정보로 반(클래스)을 생성한다
 * 6. 학생 데이터를 생성한다 (학교/반/학부모/인증정보 등 연결 포함)
 * 7. 학생 UUID로 GET /attendance/students/{id}를 호출한다
 * 8. 반환 데이터가 생성된 학생 정보의 주요 필드와 모두 일치하는지 검증한다
 */
export async function test_api_attendance_students_getById(
  connection: api.IConnection,
) {
  // 1. 학교 등록
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    },
  });
  typia.assert(school);

  // 2. 인증계정 생성 (학생/학부모)
  const studentAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(studentAuth);

  const parentAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(parentAuth);

  // 3. 학부모 정보 생성
  const parent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: parentAuth.id,
      name: RandomGenerator.name(),
      email: parentAuth.email ?? typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(parent);

  // 4. 담임(교사) UUID 임의 생성
  const teacherId = typia.random<string & tags.Format<"uuid">>();

  // 5. 반 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherId,
      name: "1-1",
      grade_level: 1,
    },
  });
  typia.assert(classroom);

  // 6. 학생 등록
  const studentName = RandomGenerator.name();
  const studentGender: "male" | "female" = RandomGenerator.pick(["male", "female"]);
  const studentBirthdate = new Date(new Date().setFullYear(new Date().getFullYear() - 8)).toISOString();
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      parent_id: parent.id,
      auth_account_id: studentAuth.id,
      name: studentName,
      gender: studentGender,
      birthdate: studentBirthdate,
    },
  });
  typia.assert(student);

  // 7. 학생 상세 조회
  const result = await api.functional.attendance.students.getById(connection, {
    id: student.id,
  });
  typia.assert(result);

  // 8. 필수 FK 및 주요 필드 일치 여부 확인
  TestValidator.equals("학생 id 일치")(result.id)(student.id);
  TestValidator.equals("학교 id 일치")(result.school_id)(school.id);
  TestValidator.equals("반 id 일치")(result.classroom_id)(classroom.id);
  TestValidator.equals("부모 id 일치")(result.parent_id)(parent.id);
  TestValidator.equals("이름 일치")(result.name)(studentName);
  TestValidator.equals("성별 일치")(result.gender)(studentGender);
  TestValidator.equals("생년월일 일치")(result.birthdate)(studentBirthdate);
  TestValidator.equals("인증계정 id 일치")(result.auth_account_id)(studentAuth.id);
}