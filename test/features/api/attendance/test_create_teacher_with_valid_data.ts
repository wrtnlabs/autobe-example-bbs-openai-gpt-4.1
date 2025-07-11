import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 신규 교사 생성(POST /attendance/teachers) 엔드 투 엔드 테스트.
 *
 * - 관리자가 신규 교사 등록 시, 필수 FK(school_id, auth_account_id) 선행 생성 후 실제 교사 정보를 입력해 등록한다.
 * - 성공 시 반환값(모든 입력 데이터, PK uuid 포함) 일치 여부를 검증한다.
 * - 또한 중복 이메일로 교사를 한 번 더 생성 시 409 에러 발생 여부도 체크한다.
 *
 * [테스트 시나리오]
 * 1. 학교 엔터티 생성 (school_id 준비)
 * 2. 인증 계정 생성 (auth_account_id 준비)
 * 3. 위 두 FK와 이름, 이메일, 전화번호로 교사 최초 등록 시도 → 결과 반환 및 입력 정보/PK 일치 검증
 * 4. 동일한 이메일로 한 번 더 등록 시 409 오류 응답 확인
 */
export async function test_api_attendance_test_create_teacher_with_valid_data(
  connection: api.IConnection,
) {
  // 1. 학교 엔터티 생성
  const schoolInput: IAttendanceSchool.ICreate = {
    name: RandomGenerator.name() + "학교",
    address: `${RandomGenerator.paragraph()(1)} ${RandomGenerator.paragraph()(1)}`,
  };
  const school = await api.functional.attendance.schools.post(connection, {
    body: schoolInput,
  });
  typia.assert(school);

  // 2. 인증 계정 생성
  const teacherEmail = typia.random<string & tags.Format<"email">>();
  const accountInput: IAttendanceAuthAccount.ICreate = {
    email: teacherEmail,
    password_hash: RandomGenerator.alphaNumeric(16),
  };
  const authAcc = await api.functional.attendance.auth.accounts.post(connection, {
    body: accountInput,
  });
  typia.assert(authAcc);

  // 3. 신규 교사 등록
  const teacherInput: IAttendanceTeacher.ICreate = {
    school_id: school.id,
    auth_account_id: authAcc.id,
    name: RandomGenerator.name(),
    email: teacherEmail,
    phone: RandomGenerator.mobile(),
  };
  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: teacherInput,
  });
  typia.assert(teacher);

  // 입력값과 반환값 각 필드 일치 및 uuid(PK) 반환되는지 확인
  TestValidator.equals("학교 FK 일치")(teacher.school_id)(teacherInput.school_id);
  TestValidator.equals("인증계정 FK 일치")(teacher.auth_account_id)(teacherInput.auth_account_id);
  TestValidator.equals("이름 일치")(teacher.name)(teacherInput.name);
  TestValidator.equals("이메일 일치")(teacher.email)(teacherInput.email);
  TestValidator.equals("전화번호 일치")(teacher.phone)(teacherInput.phone);
  // PK(uuid) 형식인지
  TestValidator.predicate("uuid 반환 확인")(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(teacher.id));
  // 생성/수정 일시
  TestValidator.predicate("created_at ISO 확인")(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(teacher.created_at));
  TestValidator.predicate("updated_at ISO 확인")(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(teacher.updated_at));

  // 4. 동일한 이메일로 교사 한 번 더 등록 시 409 에러 발생
  await TestValidator.error("중복 이메일 교사 등록 불가")(() =>
    api.functional.attendance.teachers.post(connection, {
      body: {
        ...teacherInput,
        // name/phone은 달라도 email 중복이면 409
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      },
    }),
  );
}