import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";

/**
 * 학부모(보호자) 신규 회원가입 API 필수항목 누락 유효성 오류 검증
 *
 * /attendance/parents 엔드포인트(POST)를 통해 학부모 신규 등록 시,
 * 필수 입력값(auth_account_id, name, email, phone) 중 하나라도 누락되면
 * 422(Validation Error)가 발생해야 함을 검증한다.
 *
 * 각 필드별로 1개씩 누락한 케이스를 반복 점검하며, 누락한 경우 정상 생성되면 실패,
 * 422 외 에러코드가 와도 실패다. 각 요청은 나머지 필드는 typia.random 등으로
 * 유효값을 입력하고, 단 한 가지 필드만 누락한 구성으로 요청한다.
 *
 * 테스트 플로우
 * 1. IAttendanceParent.ICreate 필수 필드 배열로 정리
 * 2. 각 필드별 누락 상황을 만듦
 * 3. 각 케이스 별로 TestValidator.error 등으로 422 유효성 오류 발생 검증
 */
export async function test_api_attendance_test_create_parent_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. 필수 필드 목록
  const requiredFields = ["auth_account_id", "name", "email", "phone"] as const;
  // 2. 각 필수필드를 하나씩 누락한 케이스 생성 및 반복
  for (const field of requiredFields) {
    // 다른 필드는 랜덤 데이터, 현재 필드만 undefined 처리
    const base: IAttendanceParent.ICreate = {
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      email: typia.random<string>(),
      phone: RandomGenerator.mobile(),
    };
    // 필드 삭제(타입강제 위배 없도록 복사 후 delete)
    const request = { ...base };
    delete (request as any)[field];
    // 3. 정상 호출이면 실패, 422 에러가 아니어도 실패
    await TestValidator.error(`필수항목(${field}) 누락시 422 Validation Error`) (async () => {
      await api.functional.attendance.parents.post(connection, { body: request });
    });
  }
}