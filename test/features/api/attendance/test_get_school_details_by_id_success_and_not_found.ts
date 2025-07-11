import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";

/**
 * 학교 상세 조회 및 예외 처리 E2E 테스트
 *
 * 이 테스트는 존재하는 학교의 id로 상세 정보를 정상 조회하고,
 * (1) 모든 필수 필드(id, name, address, created_at)가 정확하게 반환되는지,
 * (2) 없는 id 또는 잘못된 uuid 포맷의 id일 때 404(에러 메시지)를 반환하는지,
 * (3) 인증이 없는 상태에서 접근 시 401 혹은 403 에러가 발생하는지를 검증한다.
 *
 * 주요 과정
 * 1. 학교 데이터를 미리 생성(post)해서 id 확보
 * 2. 해당 id로 정상 상세 조회 (getById) 및 필드 검증
 * 3. 존재하지 않는 임의 uuid, 잘못된 형식 uuid로 상세조회 시도 → 404 오류 및 에러 메시지 확인
 * 4. 인증정보 없는 connection(Authorization 헤더 없음)으로 접근 시 401 또는 403(권한 거부) 취급 확인
 */
export async function test_api_attendance_schools_getById(
  connection: api.IConnection,
) {
  // 1. 학교 데이터 준비 및 생성
  const schoolInput: IAttendanceSchool.ICreate = {
    name: RandomGenerator.name(),
    address: RandomGenerator.paragraph()(),
  };
  const created: IAttendanceSchool = await api.functional.attendance.schools.post(connection, {
    body: schoolInput,
  });
  typia.assert(created);
  TestValidator.equals("학교명 매칭")(created.name)(schoolInput.name);
  TestValidator.equals("주소 매칭")(created.address)(schoolInput.address);

  // 2. 정상 id로 상세조회
  const detail: IAttendanceSchool = await api.functional.attendance.schools.getById(connection, {
    id: created.id,
  });
  typia.assert(detail);
  TestValidator.equals("PK 매칭")(detail.id)(created.id);
  TestValidator.equals("이름 매칭")(detail.name)(created.name);
  TestValidator.equals("주소 매칭")(detail.address)(created.address);
  // 생성일 ISO 포맷 유효성 체크
  TestValidator.predicate("생성일자 ISO 포맷")(
    !!detail.created_at &&
    typeof detail.created_at === "string" &&
    !isNaN(Date.parse(detail.created_at)),
  );

  // 3. 존재하지 않는 uuid로 상세조회 시도 (404)
  await TestValidator.error("존재하지 않는 학교 404")(() =>
    api.functional.attendance.schools.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    }),
  );

  // 4. 잘못된 형식의 uuid로 조회 시도 (404 또는 400)
  await TestValidator.error("UUID 포맷 오류")(() =>
    api.functional.attendance.schools.getById(connection, {
      id: "invalid-uuid-format" as string & tags.Format<"uuid">,
    }),
  );

  // 5. 비인증 연결(Authorization 헤더 없는 connection)로 401/403 확인
  const anonConnection = { ...connection, headers: { ...connection.headers } };
  delete anonConnection.headers.Authorization;
  await TestValidator.error("비인증 접근 401/403")(() =>
    api.functional.attendance.schools.getById(anonConnection, {
      id: created.id,
    }),
  );
}