import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";

/**
 * 본인 학부모 계정으로 로그인 후 개인정보 변경이 정상 반영되는지 검증.
 *
 * 본 테스트는 실제 사용 시나리오(자기 정보 변경)에 따라 다음 단계를 거칩니다.
 *
 * 1. 신규 학부모 회원 정보 등록
 * 2. (가정) 해당 학부모 계정으로 인증/로그인 처리(인증 API 부재 시 생략)
 * 3. 개인정보(이름, 이메일, 휴대폰 등) 일부를 수정 요청
 * 4. 반환된 결과에 수정 사항이 정상 반영됐는지 검증
 *
 * 인증 절차가 별도로 없으므로 계정 생성 → 본인 정보 변경 과정으로만 구성됩니다.
 */
export async function test_api_attendance_test_update_parent_info_as_self(
  connection: api.IConnection,
) {
  // 1. 신규 학부모 회원 정보 등록
  const parentCreateInput: IAttendanceParent.ICreate = {
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
  };
  const createdParent: IAttendanceParent = await api.functional.attendance.parents.post(connection, { body: parentCreateInput });
  typia.assert(createdParent);

  // 2. 개인정보 일부(이름, 이메일, 휴대폰) 정보 변경
  const updateInput: IAttendanceParent.IUpdate = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
  };
  const updatedParent: IAttendanceParent = await api.functional.attendance.parents.putById(connection, {
    id: createdParent.id,
    body: updateInput,
  });
  typia.assert(updatedParent);

  // 3. 변경 결과 반영 여부 검증
  TestValidator.equals("이름이 변경되었는지")(updatedParent.name)(updateInput.name);
  TestValidator.equals("이메일이 변경되었는지")(updatedParent.email)(updateInput.email);
  TestValidator.equals("휴대폰이 변경되었는지")(updatedParent.phone)(updateInput.phone);
  // auth_account_id는 미수정이므로 기존 값과 동일함
  TestValidator.equals("auth_account_id는 그대로")(updatedParent.auth_account_id)(createdParent.auth_account_id);
}