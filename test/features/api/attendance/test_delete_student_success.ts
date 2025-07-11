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
 * 학생 삭제 성공 시나리오 (어드민/교사 권한)
 *
 * 출석 시스템에서 학생(student) 데이터가 실제로 삭제될 때 전체 연관 흐름을 점검합니다.
 * 1. 인증계정 생성 → 2. 부모 생성 → 3. 학교 생성 → 4. 클래스 생성 → 5. 학생 등록
 * 6. 학생 삭제(delete 호출) → 7. 삭제 결과가 IAttendanceStudent로 반환, 주요 필드 일치 및 FK 유지
 *
 * 1. 테스트용 인증계정 생성 (학생용)
 * 2. 테스트용 부모 데이터 생성 (해당 계정 FK 연동)
 * 3. 테스트용 학교 생성
 * 4. 학교+계정으로 학급(클래스) 데이터 생성
 * 5. 생성한 부모, 학교, 클래스, 계정 정보를 활용해 학생 데이터 신규 등록
 * 6. 학생 id 지정 삭제 API 호출 → 반환값 typia.assert 및 주요 데이터 일치 여부 확인
 * 7. (제공 API 한계로 삭제 후 학생 조회 불가 - 이 파트는 스킵하며 코멘트 처리)
 * 8. 연관된 부모/반/학교는 영향 없음도 변수명 등으로 확인 및 주석 명시
 */
export async function test_api_attendance_test_delete_student_success(
  connection: api.IConnection,
) {
  // 1. 테스트용 인증계정 생성 (학생용)
  const studentAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
    } satisfies IAttendanceAuthAccount.ICreate
  });
  typia.assert(studentAuth);

  // 2. 테스트용 부모 데이터 생성 (해당 계정 FK 연동)
  const parentAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
    } satisfies IAttendanceAuthAccount.ICreate
  });
  typia.assert(parentAuth);
  const parent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: parentAuth.id,
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceParent.ICreate
  });
  typia.assert(parent);

  // 3. 테스트용 학교 데이터 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate
  });
  typia.assert(school);

  // 4. 테스트용 클래스(반) 데이터 생성 (담임 teacher_id = studentAuth.id)
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: studentAuth.id, // 테스트에서 담임교사를 별도 Creation API 없이 studentAuth 활용
      name: `테스트${RandomGenerator.alphaNumeric(2)}`,
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate
  });
  typia.assert(classroom);

  // 5. 생성한 부모, 학교, 클래스, 인증계정 정보로 테스트 학생 데이터 등록
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      parent_id: parent.id,
      auth_account_id: studentAuth.id,
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: typia.random<string & tags.Format<"date-time">>(),
    } satisfies IAttendanceStudent.ICreate
  });
  typia.assert(student);

  // 6. 생성된 학생 id로 삭제 API 호출 → 삭제 성공 후 반환값 typia.assert, 주요 필드 일치 체크
  const deleted = await api.functional.attendance.students.eraseById(connection, {
    id: student.id
  });
  typia.assert(deleted);
  TestValidator.equals("삭제된 학생 id 일치")(deleted.id)(student.id);
  TestValidator.equals("삭제된 학생 계정 FK 일치")(deleted.auth_account_id)(student.auth_account_id);
  TestValidator.equals("삭제된 학생 이름 일치")(deleted.name)(student.name);
  TestValidator.equals("삭제된 학생 소속 반 FK 일치")(deleted.classroom_id)(student.classroom_id);

  // 7. (삭제 후 학생 자체 조회 API가 없는 관계로, 실제 "존재하지 않음" 확인은 스킵)

  // 8. 부모/반/학교 등 연관 데이터 영향 없음을 변수로 검증, 별도 API 없으니 주석 처리
  // → parent, school, classroom 등은 여전히 존재(삭제 영향 無)
}