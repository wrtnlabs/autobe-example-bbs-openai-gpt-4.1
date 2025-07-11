import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";

/**
 * 학부모 본인 계정으로 자신의 PK로 상세 정보를 조회할 때 개인정보가 정확하게 반환되는지 검증합니다.
 *
 * 이 테스트는 새로 학부모로 회원가입한 후, 본인 PK(id)로 /attendance/parents/{id} API를 호출했을 때
 * 이름, 이메일, 전화번호, 인증계정ID 등 주요 개인정보와 생성/수정일이 모두 정상적으로 응답되는지
 * 그리고 반환값이 회원가입 시 입력한 내용과 일치하는지를 종합적으로 점검합니다.
 * (자녀 등 추가 참조 필드는 현 DTO 정의상 없음)
 *
 * 1. 학부모 회원가입(POST /attendance/parents)
 * 2. 회원가입 결과 id로 상세조회(GET /attendance/parents/{id})
 * 3. 필수 개인정보 필드 일치 검증 및 created_at/updated_at 값 포맷 체크
 */
export async function test_api_attendance_test_get_parent_details_as_owner(
  connection: api.IConnection,
) {
  // 1. 학부모 회원가입 (랜덤 정보로 생성)
  const parentCreateInput = {
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
  } satisfies IAttendanceParent.ICreate;
  const parent = await api.functional.attendance.parents.post(connection, {
    body: parentCreateInput,
  });
  typia.assert(parent);

  // 2. 가입한 학부모 PK로 상세 정보 조회
  const detail = await api.functional.attendance.parents.getById(connection, {
    id: parent.id,
  });
  typia.assert(detail);

  // 3. 입력정보와 반환값 주요 필드 동일성 및 포맷 검증
  TestValidator.equals("PK 일치")(detail.id)(parent.id);
  TestValidator.equals("auth_account_id 일치")(detail.auth_account_id)(parent.auth_account_id);
  TestValidator.equals("이름 일치")(detail.name)(parent.name);
  TestValidator.equals("이메일 일치")(detail.email)(parent.email);
  TestValidator.equals("전화번호 일치")(detail.phone)(parent.phone);
  TestValidator.predicate("created_at ISO8601 포맷 및 값 존재")(
    !!detail.created_at && !isNaN(Date.parse(detail.created_at)),
  );
  TestValidator.predicate("updated_at ISO8601 포맷 및 값 존재")(
    !!detail.updated_at && !isNaN(Date.parse(detail.updated_at)),
  );
}