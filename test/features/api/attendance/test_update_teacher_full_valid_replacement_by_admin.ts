import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 교사 전체 정보(학교, 인증계정, 이름, 이메일, 연락처)를 admin이 완전 대체(Full PUT)하는 경우를 검증.
 *
 * 검증 항목:
 * 1. PUT 업데이트 후 모든 필드가 요청 값으로 반영되었고, updated_at이 갱신·불변 필드는 유지되는지 확인
 * 2. 이미 다른 교사가 사용하는 이메일로 대체시 409 Conflict 응답 오류 확인
 * 3. 존재하지 않는 id에 PUT 시도 시 404 Not Found로 에러 발생 확인
 * 4. FK(school_id, auth_account_id) 잘못 전달 시 422 Unprocessable Entity 에러 반환 확인
 *
 * === 주요 과정 ===
 * 1) 테스트 데이터 사전 준비: 교사(put 타겟), 학교, 인증계정, 중복 이메일 교사 모두 새로 생성
 * 2) 정상 수정: 교사 전체정보(학교, 인증계정, 이름, 이메일, 전화) 모두 변경 → 성공 및 응답 일치/변경사항 검증
 * 3) 중복 이메일로 수정 시도 → 409 에러
 * 4) 없는 교사 id로 호출 → 404 에러
 * 5) 잘못된 school_id, auth_account_id로 호출 → 422 에러
 */
export async function test_api_attendance_test_update_teacher_full_valid_replacement_by_admin(
  connection: api.IConnection,
) {
  // === 1. 신규 학교 생성 ===
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.paragraph()(2),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // === 2. 신규 인증 계정 생성 ===
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authAccount);

  // === 3. PUT 대상 교사 생성 (수정 타겟) ===
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

  // === 4. 중복 이메일용 교사 생성(탐색/충돌용) ===
  const dupSchool = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.paragraph()(2),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(dupSchool);

  const dupAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(dupAuth);

  const dupTeacherEmail = typia.random<string & tags.Format<"email">>();
  const dupTeacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: dupSchool.id,
      auth_account_id: dupAuth.id,
      name: RandomGenerator.name(),
      email: dupTeacherEmail,
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceTeacher.ICreate,
  });
  typia.assert(dupTeacher);

  // === 5. 정상 PUT: 모든 필드 대체 ===
  const newSchool = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.paragraph()(2),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(newSchool);
  const newAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(28),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(newAuth);
  const updateInput: IAttendanceTeacher.IUpdate = {
    school_id: newSchool.id,
    auth_account_id: newAuth.id,
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
  };
  const updated = await api.functional.attendance.teachers.putById(connection, {
    id: teacher.id,
    body: updateInput,
  });
  typia.assert(updated);
  TestValidator.equals("id unchanged")(updated.id)(teacher.id);
  TestValidator.equals("학교 id")(updated.school_id)(updateInput.school_id);
  TestValidator.equals("계정 id")(updated.auth_account_id)(updateInput.auth_account_id);
  TestValidator.equals("이름")(updated.name)(updateInput.name);
  TestValidator.equals("이메일")(updated.email)(updateInput.email);
  TestValidator.equals("전화번호")(updated.phone)(updateInput.phone);
  TestValidator.notEquals("updated_at 변경됨")(updated.updated_at)(teacher.updated_at);
  TestValidator.equals("created_at 그대로")(updated.created_at)(teacher.created_at);

  // === 6. 중복 이메일 conflict(409) ===
  const inputWithDupEmail: IAttendanceTeacher.IUpdate = {
    ...updateInput,
    email: dupTeacher.email, // 중복 이메일 사용
  };
  await TestValidator.error("중복 이메일은 409")(async () => {
    await api.functional.attendance.teachers.putById(connection, {
      id: teacher.id,
      body: inputWithDupEmail,
    });
  });

  // === 7. 404 Not Found (없는 id) ===
  const notExistId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("404 Not Found")(async () => {
    await api.functional.attendance.teachers.putById(connection, {
      id: notExistId,
      body: updateInput,
    });
  });

  // === 8. 422 Unprocessable Entity (잘못된 school_id / auth_account_id) ===
  // 8-1) 잘못된 school_id
  await TestValidator.error("wrong school_id로는 422")(async () => {
    await api.functional.attendance.teachers.putById(connection, {
      id: teacher.id,
      body: {
        ...updateInput,
        school_id: typia.random<string & tags.Format<"uuid">>(),
      },
    });
  });
  // 8-2) 잘못된 auth_account_id
  await TestValidator.error("wrong auth_account_id로는 422")(async () => {
    await api.functional.attendance.teachers.putById(connection, {
      id: teacher.id,
      body: {
        ...updateInput,
        auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      },
    });
  });
}