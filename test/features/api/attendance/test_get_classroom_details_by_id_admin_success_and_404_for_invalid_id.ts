import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * [성공/실패] 학급 상세정보(ID 기반) 조회 API E2E 검증
 *
 * - 성공: 관리자/교사로 로그인한 유저가 학급 생성 후 해당 classroom의 id로 상세정보를 조회하면,
 *   모든 atomic 필드(name, grade_level, school_id, teacher_id 등)가 정확히 반환되어야 함
 * - 실패: 임의의 잘못된(존재하지 않는) UUID로 조회 시 404 에러가 발생해야 함
 *
 * ※ 권한 없는 유저(학부모/학생) 접근에 대한 403 테스트는 별도의 인증 상태/역할 기반 토큰 발급 API가 제공되지 않아
 *   본 테스트에선 구현 생략
 *
 * [테스트 시나리오]
 * 1. 인증계정(관리자/교사) 생성
 * 2. 학교 생성 및 id 획득
 * 3. 교사 엔티티 생성(school_id, auth_account_id)
 * 4. 학급 생성(classroom 등록)
 * 5. 해당 classroom.id로 상세정보 정상 조회 및 모든 필드 일치 검증
 * 6. 존재하지 않는 임의의 classroom id로 조회 시 404 오류 반환 확인
 */
export async function test_api_attendance_test_get_classroom_details_by_id_admin_success_and_404_for_invalid_id(
  connection: api.IConnection,
) {
  // 1. 인증계정(관리자/교사) 생성
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(24),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authAccount);

  // 2. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 교사 엔티티 생성(school_id, auth_account_id)
  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: authAccount.id,
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceTeacher.ICreate,
  });
  typia.assert(teacher);

  // 4. 학급 생성(classroom 등록)
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher.id,
      name: RandomGenerator.alphaNumeric(6),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 5. 해당 classroom.id로 상세정보 정상 조회 및 모든 필드 일치 검증
  const result = await api.functional.attendance.classrooms.getById(connection, {
    id: classroom.id,
  });
  typia.assert(result);

  TestValidator.equals("classroom.id")(result.id)(classroom.id);
  TestValidator.equals("classroom.name")(result.name)(classroom.name);
  TestValidator.equals("classroom.grade_level")(result.grade_level)(classroom.grade_level);
  TestValidator.equals("classroom.school_id")(result.school_id)(classroom.school_id);
  TestValidator.equals("classroom.teacher_id")(result.teacher_id)(classroom.teacher_id);

  // 6. 존재하지 않는 임의의 classroom id로 조회 시 404 오류 반환 확인
  await TestValidator.error("존재하지 않는 학급 ID 조회시 404")(async () => {
    await api.functional.attendance.classrooms.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}