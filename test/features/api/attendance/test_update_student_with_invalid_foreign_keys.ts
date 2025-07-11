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
 * 존재하지 않는 FK(school_id/classroom_id/parent_id/auth_account_id) 조합으로 학생 정보를 전체 업데이트(putById) 시 422 오류 발생 여부 검증
 *
 * 이 테스트는 학생 엔터티에 대해 실제 존재하는 FK 값으로 정상 생성한 뒤, 존재하지 않는(랜덤 UUID)
 * school_id/classroom_id/parent_id/auth_account_id 조합으로 putById(전체수정) API를 호출할 때
 * expected FK constraint violation으로 인한 422 오류가 반환되는지 증명한다.
 *
 * [테스트 단계]
 * 1. 인증 계정 (A) 생성
 * 2. 학교 (S) 생성
 * 3. 학급/반 (C) 생성 (S의 PK로, 임의 teacher_id)
 * 4. 보호자(부모) (P) 생성 (별도 인증계정 B로 연결)
 * 5. 학생 (O) 생성 (A/S/C/P FK 이용)
 * 6. 존재하지 않는 school_id/classroom_id/parent_id/auth_account_id로 putById 테스트
 *   - 모두 없는 값
 *   - parent_id만 없는 값(나머지는 실제값)
 *
 * 정상 생성 및 FK 연결 검증 후, FK 제약 위반에 따른 422 error를 반드시 확인.
 */
export async function test_api_attendance_test_update_student_with_invalid_foreign_keys(
  connection: api.IConnection,
) {
  // 1. 인증 계정 (A/B) 생성
  const authA = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authA);
  const authB = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authB);

  // 2. 학교(S) 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.paragraph()(),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 반(C) 생성 (school_id 실제값, 임의 teacher_id)
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.alphaNumeric(6),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 4. 보호자(P) 생성 (authB 이용)
  const parent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: authB.id,
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceParent.ICreate,
  });
  typia.assert(parent);

  // 5. 학생(O) 생성 (authA/S/C/P 각각 실제값으로)
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      parent_id: parent.id,
      auth_account_id: authA.id,
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: typia.random<string & tags.Format<"date-time">>(),
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);

  // --- 정상 생성된 PK, FK 연결검증 step ---
  TestValidator.equals("school 연결 확인")(student.school_id)(school.id);
  TestValidator.equals("classroom 연결 확인")(student.classroom_id)(classroom.id);
  TestValidator.equals("parent 연결 확인")(student.parent_id)(parent.id);
  TestValidator.equals("auth 계정 연결 확인")(student.auth_account_id)(authA.id);

  // 6-1. 존재하지 않는 전부 랜덤 FK로 putById 시도 (422 오류 기대)
  const invalidFkUpdate: IAttendanceStudent.IUpdate = {
    school_id: typia.random<string & tags.Format<"uuid">>(),
    classroom_id: typia.random<string & tags.Format<"uuid">>(),
    parent_id: typia.random<string & tags.Format<"uuid">>(),
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    gender: RandomGenerator.pick(["male", "female"]),
    birthdate: typia.random<string & tags.Format<"date-time">>(),
  };
  await TestValidator.error("존재하지 않는 FK 조합 전체로 putById → 422")(async () => {
    await api.functional.attendance.students.putById(connection, {
      id: student.id,
      body: invalidFkUpdate,
    });
  });

  // 6-2. parent_id만 없는 랜덤값, 나머지 실제값 → 역시 422 오류 기대
  const invalidParentUpdate: IAttendanceStudent.IUpdate = {
    school_id: school.id,
    classroom_id: classroom.id,
    parent_id: typia.random<string & tags.Format<"uuid">>(),
    auth_account_id: authA.id,
    name: RandomGenerator.name(),
    gender: RandomGenerator.pick(["male", "female"]),
    birthdate: typia.random<string & tags.Format<"date-time">>(),
  };
  await TestValidator.error("존재하지 않는 parent_id만 포함 putById → 422")(async () => {
    await api.functional.attendance.students.putById(connection, {
      id: student.id,
      body: invalidParentUpdate,
    });
  });
}