import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";

/**
 * 존재하지 않는 school_id 혹은 auth_account_id를 사용하여 교사(Teacher) 등록을 시도할 경우,
 * 서버가 422 혹은 404 오류(즉, 참조 무결성 위반 혹은 리소스 미존재)로 정상적으로 실패 처리되는지 검증합니다.
 *
 * 이 테스트는 외래키(참조관계) 제약의 정상 동작을 보장하는 것으로,
 * 1. 무작위(존재하지 않는) school_id와 무작위(존재하지 않는) auth_account_id를 사용한 시도
 * 2. (선택적으로) 각각 하나만 invalid인 케이스를 추가할 수 있음
 *
 * 실제로는 아직 존재하지 않는 school_id, auth_account_id의 uuid 값은 임의로 생성하여 테스트합니다.
 *
 * - 성공(성공적으로 생성됨): 테스트 실패 (이 경우 원하지 않는 동작)
 * - 실패(422/404 등 client error): 테스트 성공 (참조무결성 위반/리소스 미존재)
 */
export async function test_api_attendance_test_create_teacher_with_invalid_school_or_auth_account(
  connection: api.IConnection,
) {
  // 무작위(존재하지 않는) school_id, auth_account_id로 교사 등록 시도
  const invalidSchoolId: string = typia.random<string & tags.Format<"uuid">>();
  const invalidAuthAccountId: string = typia.random<string & tags.Format<"uuid">>();
  const teacherCreate = {
    school_id: invalidSchoolId,
    auth_account_id: invalidAuthAccountId,
    name: "테스트 교사",
    email: typia.random<string & tags.Format<"email">>(),
    phone: "010-9999-9999",
  } satisfies IAttendanceTeacher.ICreate;

  // 반드시 422/404 등의 오류가 발생해야 정상
  await TestValidator.error("존재하지 않는 school_id, auth_account_id로 등록하면 실패해야 함")(
    () => api.functional.attendance.teachers.post(connection, { body: teacherCreate }),
  );

  // 추가로, 한쪽만 invalid인 케이스 추가 예시(선택사항):
  // 실제 테스트 환경에서 사용가능한 valid 값 필요.
  // const validSchoolId = ...;
  // const teacherCreate2 = {
  //   school_id: validSchoolId,
  //   auth_account_id: invalidAuthAccountId,
  //   name: "테스트 교사",
  //   email: typia.random<string & tags.Format<"email">>(),
  //   phone: "010-1111-1111",
  // } satisfies IAttendanceTeacher.ICreate;
  // await TestValidator.error("존재하지 않는 auth_account_id만 invalid해도 실패해야 함")(
  //   () => api.functional.attendance.teachers.post(connection, { body: teacherCreate2 }),
  // );
}