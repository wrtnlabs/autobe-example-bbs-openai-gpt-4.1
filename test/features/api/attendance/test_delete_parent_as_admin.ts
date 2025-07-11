import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";

/**
 * 관리자 권한으로 특정 학부모(보호자)를 삭제하는 API의 정상 동작 및 예외 처리 검증.
 *
 * - 신규 학부모 레코드를 생성(POST /attendance/parents)
 * - 관리자 권한으로 해당 id로 삭제 요청(DELETE /attendance/parents/{id})
 * - 삭제 성공 응답시 id 등 주요 필드 값 검증
 * - 동일 id로 재삭제 시 적절한 에러(예: 404 not found) 발생 확인
 *
 * 이 테스트는 논리삭제/물리삭제 정책에 따라 실제 데이터 상태가 정책상 어떻게 처리되는지(즉, object 반환 여부 등)
 * 까지 실제 응답을 검증하여 비즈니스 규정 준수까지 포함한다.
 */
export async function test_api_attendance_parents_eraseById_as_admin(
  connection: api.IConnection,
) {
  // 1. 테스트용 학부모 신규 생성 (삭제 전용)
  const createInput: IAttendanceParent.ICreate = {
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    email: typia.random<string>(),
    phone: RandomGenerator.mobile(),
  };
  const created: IAttendanceParent = await api.functional.attendance.parents.post(connection, {
    body: createInput,
  });
  typia.assert(created);
  // 반환값 필수 필드가 실제 입력값과 일치하는지 검증
  TestValidator.equals("auth_account_id 동일")(created.auth_account_id)(createInput.auth_account_id);
  TestValidator.equals("이메일 동일")(created.email)(createInput.email);
  TestValidator.equals("이름 동일")(created.name)(createInput.name);
  TestValidator.equals("휴대폰 동일")(created.phone)(createInput.phone);

  // 2. 관리자 권한으로 해당 학부모 삭제
  const erased: IAttendanceParent = await api.functional.attendance.parents.eraseById(connection, {
    id: created.id,
  });
  typia.assert(erased);
  // 삭제된 객체의 id와 입력값이 일치하는지 검증
  TestValidator.equals("삭제된 id 일치")(erased.id)(created.id);

  // 3. 동일 id로 재삭제 시 API가 적절한 예외를 반환하는지 점검
  await TestValidator.error("이미 삭제된 학부모 재삭제는 에러")(async () => {
    await api.functional.attendance.parents.eraseById(connection, {
      id: created.id,
    });
  });
}