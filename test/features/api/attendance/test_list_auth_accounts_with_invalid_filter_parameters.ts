import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IPageIAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceAuthAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 인증계정(auth_account) 목록 조회 API의 잘못된 파라미터에 대한 검증 오류 테스트
 *
 * 이 테스트는 다음과 같은 경우 각각 서버가 검증 오류(422 등)를 올바르게 반환하는지 확인합니다.
 *
 * 1. sort에 존재하지 않는 컬럼명을 전달했을 때
 * 2. created_at_from, created_at_to에 ISO8601이 아닌 잘못된 날짜 문자열을 전달했을 때
 * 3. order에 허용되지 않는 enum 값(asc, desc 외)을 전달했을 때
 *
 * 각각의 경우 별도의 TestValidator.error() 블록으로 예외 발생 여부를 검증합니다.
 * 실제 DTO 스키마에 없는 필드는 절대 추가하지 않으며, 타입 시스템 상 허용되는 방식 내에서만 잘못된 값을 전달해 오류를 유도해야 합니다.
 */
export async function test_api_attendance_test_list_auth_accounts_with_invalid_filter_parameters(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 컬럼명으로 sort를 전달한 경우 검증
  TestValidator.error("존재하지 않는 sort 값으로 422 오류 반환")(
    async () => {
      await api.functional.attendance.auth.accounts.patch(connection, {
        body: {
          sort: "not_exist_field",
        },
      });
    },
  );

  // 2. 잘못된 날짜 형식(created_at_from)에 대해 422 응답 검증
  TestValidator.error("created_at_from에 잘못된 날짜 문자열로 422 오류 반환")(
    async () => {
      await api.functional.attendance.auth.accounts.patch(connection, {
        body: {
          created_at_from: "notadate",
        },
      });
    },
  );

  // 3. 잘못된 날짜 형식(created_at_to)에 대해 422 응답 검증
  TestValidator.error("created_at_to에 잘못된 날짜 문자열로 422 오류 반환")(
    async () => {
      await api.functional.attendance.auth.accounts.patch(connection, {
        body: {
          created_at_to: "notadate",
        },
      });
    },
  );

  // 4. order에 허용되지 않는 값을 전달한 경우 검증(asc|desc 외의 값)
  TestValidator.error("order에 잘못된 값(ascending)으로 422 오류 반환")(
    async () => {
      await api.functional.attendance.auth.accounts.patch(connection, {
        body: {
          order: "ascending" as any, // asc, desc 외의 잘못된 값 intentional
        },
      });
    },
  );
}