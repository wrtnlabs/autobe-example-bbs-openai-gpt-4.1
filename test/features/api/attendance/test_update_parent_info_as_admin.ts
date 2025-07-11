import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";

/**
 * [관리자 권한으로 학부모(보호자) 정보 수정 E2E 테스트]
 *
 * 이 테스트는 시스템 관리자가 attendance_parent(학부모/보호자) 엔터티의 핵심 개인정보(이름, 이메일, 연락처, 인증계정ID 등)를
 * PUT /attendance/parents/{id} API로 정상적으로 부분/전체 수정할 수 있음을 검증합니다.
 *
 * 1. 신규 학부모 샘플(IAttendanceParent.ICreate) 생성 → POST /attendance/parents 호출하여 등록 및 반환값 확인
 * 2. 기존 학부모 데이터 기반으로 이름, 이메일, 휴대폰번호 등 2~3개 속성을 임의 수정한 update body 준비
 * 3. PUT /attendance/parents/{id} 호출, 정상 응답(200 OK) 및 반환오브젝트 타입·수정값 반영 검증(typia.assert + TestValidator)
 * 4. 업데이트 이전 정보와의 diff 체크로 실제 변경 성공 보장
 */
export async function test_api_attendance_test_update_parent_info_as_admin(
  connection: api.IConnection,
) {
  // 1. 신규 학부모 생성 (IAttendanceParent.ICreate)
  const createInput: IAttendanceParent.ICreate = {
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: "김테스트",
    email: typia.random<string>() + "@parent-test.com",
    phone: "010" + typia.random<string>().slice(0, 8),
  };

  const parent = await api.functional.attendance.parents.post(connection, {
    body: createInput,
  });
  typia.assert(parent);

  // 업데이트 대상 속성 2~3개 임의 변경 (예: 이름, 이메일)
  const newName = createInput.name + "수정";
  const newEmail = "update_" + createInput.email;
  const updateInput: IAttendanceParent.IUpdate = {
    name: newName,
    email: newEmail,
    // phone 등도 추가 변경시: phone: "010" + typia.random<string>().slice(0, 8),
  };

  // 2. PUT /attendance/parents/{id} 호출로 정보 수정
  const updated = await api.functional.attendance.parents.putById(connection, {
    id: parent.id,
    body: updateInput,
  });
  typia.assert(updated);

  // 3. 정보 실제 변경(반영) 검증
  TestValidator.equals("이름 변경 반영됨")(updated.name)(newName);
  TestValidator.equals("이메일 변경 반영됨")(updated.email)(newEmail);
  TestValidator.notEquals("수정 전후 객체 불변성 깨짐")(updated.name)(parent.name);
  TestValidator.notEquals("수정 전후 이메일 다름")(updated.email)(parent.email);

  // 변경되지 않은 컬럼은 원본 값과 동일함도 체크 가능
  TestValidator.equals("auth_account_id는 불변")(updated.auth_account_id)(parent.auth_account_id);
  TestValidator.equals("phone 불변성 확인")(updated.phone)(parent.phone);
}