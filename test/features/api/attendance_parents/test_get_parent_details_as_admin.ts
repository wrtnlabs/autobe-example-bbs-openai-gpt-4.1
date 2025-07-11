import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";

/**
 * 관리자 권한으로 특정 학부모 상세정보(PK 기준)를 조회하는 기능의 정상 동작을 검증합니다.
 *
 * 이 테스트는 시스템 관리자가 학부모 상세 정보를 정확히 열람할 수 있는지 확인하기 위한 E2E 시나리오입니다.
 *
 * [테스트 흐름]
 * 1. 선행 데이터: 테스트용 학부모 계정을 새로 생성(POST /attendance/parents)
 *    - 입력값: 유효한 IAttendanceParent.ICreate 랜덤 데이터
 *    - 반환값: 생성된 학부모 객체(IAttendanceParent), PK(id) 확보
 * 2. 상세조회: GET /attendance/parents/{id} 실행
 *    - 1단계에서 획득한 id로 상세조회 API 호출
 *    - 반환값: 학부모 전체 정보(IAttendanceParent)
 * 3. 상세 필드 검증
 *    - typia.assert로 구조 및 필수 필드가 모두 포함됨을 검증
 *    - 생성시 입력한 값(name, email, phone, auth_account_id)이 동일하게 반환되는지 TestValidator.equals로 확인
 *    - created_at, updated_at 등 시스템 자동 세팅 필드의 포함성/형식도 typia.assert로 검증
 *
 * 본 테스트를 통해 출결 관리자(권한) 관점에서 개인정보 열람 및 데이터 일관성이 보장되는지 검정합니다.
 */
export async function test_api_attendance_parents_getById(
  connection: api.IConnection,
) {
  // 1. 테스트용 학부모 계정 생성
  const parentInput: IAttendanceParent.ICreate = {
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
  };
  const createdParent: IAttendanceParent = await api.functional.attendance.parents.post(connection, { body: parentInput });
  typia.assert(createdParent);

  // 2. 상세정보 조회 (관리자 권한 가정)
  const foundParent: IAttendanceParent = await api.functional.attendance.parents.getById(connection, { id: createdParent.id });
  typia.assert(foundParent);

  // 3. 주요 필드 및 데이터 일치성 검증
  TestValidator.equals("id 일치")(foundParent.id)(createdParent.id);
  TestValidator.equals("auth_account_id 일치")(foundParent.auth_account_id)(parentInput.auth_account_id);
  TestValidator.equals("이름 일치")(foundParent.name)(parentInput.name);
  TestValidator.equals("이메일 일치")(foundParent.email)(parentInput.email);
  TestValidator.equals("연락처 일치")(foundParent.phone)(parentInput.phone);
  // 시스템 자동관리 필드(필수 포함 및 포맷 확인)
  TestValidator.predicate("created_at 포함 및 포맷 확인")(typeof foundParent.created_at === "string" && foundParent.created_at.length > 0);
  TestValidator.predicate("updated_at 포함 및 포맷 확인")(typeof foundParent.updated_at === "string" && foundParent.updated_at.length > 0);
}