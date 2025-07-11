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
 * 존재하지 않는 학생 id 또는 삭제 정책상 금지된 id 제거 시도의 예외 처리 검증
 *
 * - 존재하지 않는 학생 id를 삭제(one-shot random uuid)할 때 API가 404 Not Found(혹은 422 등) 에러를 반환하는지 검증하며,
 * - 출석/학급/부모 등 연관 FK로 인해 정책상 삭제가 금지된 실제 학생 id에 대해 API가 409 Conflict(혹은 정책상 거부) 에러를 반환하는지도 검증한다.
 *
 * 테스트는 아래 단계로 구성된다.
 * 1. 관계데이터(학교, 계정, 부모, 학급) 및 학생 계정/레코드 생성
 * 2. 존재하지 않는 학생 id로 삭제시도(error)
 * 3. 부모(FK) 등으로 논리적으로 연결되어 삭제 금지되어야 하는 학생 삭제 시도(error)
 */
export async function test_api_attendance_test_delete_student_not_found_or_conflict(
  connection: api.IConnection,
) {
  // 1. 테스트용 기초 데이터 준비
  // (1) 인증 계정 생성
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authAccount);

  // (2) 학부모 생성
  const parent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: authAccount.id,
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceParent.ICreate,
  });
  typia.assert(parent);

  // (3) 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphabets(8),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // (4) 교사용 계정 별도 생성(교사 uuid 참조용)
  const teacherAuthAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(teacherAuthAccount);
  // 임의 uuid(Non-existing) 대신 실제 계정 활용. 단, 실제 teacher entity 없어도 classroom 생성용 teacher_id.

  // (5) 학급 생성(teacher_id는 실제 teacher entity 존재 안 해도 uuid 준수)
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherAuthAccount.id as string & tags.Format<"uuid">,
      name: RandomGenerator.alphabets(3),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // (6) 정책상 삭제가 금지될 학생 생성(부모 등 FK 연결)
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      parent_id: parent.id,
      auth_account_id: authAccount.id,
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: new Date().toISOString(),
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);

  // 2. 존재하지 않는 id로 삭제시도 → 404/422 등 not found error 검증
  await TestValidator.error("존재하지 않는 학생 id 삭제시 404 등 not found")(async () => {
    await api.functional.attendance.students.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 3. 정책상 삭제가 금지되어야 하는 학생 id 삭제시도 → 409 등 conflict error 검증
  await TestValidator.error("부모(FK)로 연결된 학생 삭제시 409 등 conflict")(async () => {
    await api.functional.attendance.students.eraseById(connection, {
      id: student.id,
    });
  });
}