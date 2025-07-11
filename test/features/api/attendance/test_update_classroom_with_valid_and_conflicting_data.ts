import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 학급(반) 데이터 수정 API의 엔드투엔드 테스트.
 *
 * - 성공: 이름, 학년, 교사 등 정상 데이터로 갱신 시 PK와 함께 모든 필드가 반영된 최신 학급 데이터가 반환됨을 검증.
 * - 실패: (a) 존재하지 않는 PK ID로 PUT, (b) 동일 학교 내 중복 학급명으로 업데이트 시 409, (c) 잘못된 school_id/teacher_id로 수정(존재하지 않는 FK) 시 404 또는 422, (d) 권한 제한 계정 PUT(불가, 인증/권한 API 부재시 생략)
 *
 * 테스트 순서:
 * 1. 관리자 계정, 교사 계정(담임/타교사용) 생성 → 학교 데이터 신규 생성
 * 2. 두 명의 교사 계정(동일 학교 소속) 생성
 * 3. 학교에 두 개의 학급 생성(서로 다른 이름)
 * 4. (성공) 첫 번째 학급의 이름/학년/담임교사 모두 변경, 반환값/DB 일치 검증
 * 5. (실패) 첫 번째 학급을 두 번째 학급명으로 PUT → 409 오류
 * 6. (실패) 랜덤 UUID로 PUT(존재X 학급 PK) → 404 오류
 * 7. (실패) 존재하지 않는 school_id/teacher_id로 PUT → 404 또는 422 오류
 *
 * 인증/권한 API가 제공되지 않으므로, 실제 권한 거부(403) 시나리오는 생략.
 */
export async function test_api_attendance_test_update_classroom_with_valid_and_conflicting_data(
  connection: api.IConnection,
) {
  // 1. 관리자/교사 인증 계정(2개), 학교 생성
  const adminAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashed-password-admin",
    },
  });
  typia.assert(adminAccount);

  const teacherAccount1 = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashed-password-t1",
    },
  });
  typia.assert(teacherAccount1);
  const teacherAccount2 = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashed-password-t2",
    },
  });
  typia.assert(teacherAccount2);

  // 2. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: `학교-${RandomGenerator.alphaNumeric(6)}`,
      address: `서울시 중구 ${RandomGenerator.alphaNumeric(10)}`,
    },
  });
  typia.assert(school);

  // 3. 교사 2명(동일 학교 소속) 생성
  const teacher1 = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: teacherAccount1.id,
      name: `담임교사-${RandomGenerator.name()}`,
      email: teacherAccount1.email ?? typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(teacher1);

  const teacher2 = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: teacherAccount2.id,
      name: `타교사-${RandomGenerator.name()}`,
      email: teacherAccount2.email ?? typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(teacher2);

  // 4. 학급 2개 생성(서로 다른 이름)
  const className1 = `1-${RandomGenerator.alphaNumeric(4)}`;
  const className2 = `2-${RandomGenerator.alphaNumeric(4)}`;
  const classroom1 = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher1.id,
      name: className1,
      grade_level: 1,
    },
  });
  typia.assert(classroom1);

  const classroom2 = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher2.id,
      name: className2,
      grade_level: 2,
    },
  });
  typia.assert(classroom2);

  // 5. (성공) classroom1의 이름/학년/담임교사 변경
  const newName = `변경반-${RandomGenerator.alphaNumeric(3)}`;
  const updatedGrade = 3;
  const updateResult = await api.functional.attendance.classrooms.putById(connection, {
    id: classroom1.id,
    body: {
      school_id: school.id,
      teacher_id: teacher2.id,
      name: newName,
      grade_level: updatedGrade,
    },
  });
  typia.assert(updateResult);
  TestValidator.equals("학급정보 갱신후 반환확인")(updateResult)({
    id: classroom1.id,
    school_id: school.id,
    teacher_id: teacher2.id,
    name: newName,
    grade_level: updatedGrade,
    created_at: classroom1.created_at,
    updated_at: updateResult.updated_at,
  });

  // 6. (실패) classroom1을 classroom2의 이름으로 변경 시도 → 409
  await TestValidator.error("동일 학교내 학급명 중복으로 인한 409")(async () => {
    await api.functional.attendance.classrooms.putById(connection, {
      id: classroom1.id,
      body: {
        school_id: school.id,
        teacher_id: teacher2.id,
        name: className2, // 이미 다른 반에서 사용한 이름
        grade_level: 2,
      },
    });
  });

  // 7. (실패) 존재하지 않는 PK로 PUT(404)
  await TestValidator.error("존재하지 않는 학급 PK로 404")(async () => {
    await api.functional.attendance.classrooms.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: {
        school_id: school.id,
        teacher_id: teacher2.id,
        name: newName,
        grade_level: updatedGrade,
      },
    });
  });

  // 8. (실패) 이상한 school_id(FK), teacher_id(FK)로 PUT
  await TestValidator.error("존재하지 않는 school_id로 PUT시 404/422 오류")(async () => {
    await api.functional.attendance.classrooms.putById(connection, {
      id: classroom1.id,
      body: {
        school_id: typia.random<string & tags.Format<"uuid">>(),
        teacher_id: teacher2.id,
        name: newName,
        grade_level: updatedGrade,
      },
    });
  });
  await TestValidator.error("존재하지 않는 teacher_id로 PUT시 404/422 오류")(async () => {
    await api.functional.attendance.classrooms.putById(connection, {
      id: classroom1.id,
      body: {
        school_id: school.id,
        teacher_id: typia.random<string & tags.Format<"uuid">>(),
        name: newName,
        grade_level: updatedGrade,
      },
    });
  });

  // 9. (실패) 권한X 계정 PUT(불가)
  // - 인증/권한 API 미지원이므로 별도 구현 생략
}