import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 잘못된 이메일 형식으로 인증 계정 생성 시 올바른 입력값 검증 에러(422) 발생 여부를 검증합니다.
 *
 * 본 테스트는 이메일 필드에 '@'이 없는 잘못된 값을 포함시켜 인증 계정 생성 API를 호출하고,
 * 서버가 요청값의 형식 오류를 감지하여 유효성 검증 에러(HTTP 422)를 반환하는지를 확인합니다.
 *
 * 1. '@' 없이 잘못된 이메일로 인증 계정 생성 요청
 * 2. 입력값 형식 오류로 422 에러 발생 확인
 */
export async function test_api_attendance_test_create_auth_account_with_invalid_email_format(
  connection: api.IConnection,
) {
  await TestValidator.error("잘못된 이메일 형식 시 422 에러")(
    () =>
      api.functional.attendance.auth.accounts.post(connection, {
        body: {
          email: "invalidemail.com", // '@'가 빠진 잘못된 이메일
          password_hash: null,
        } satisfies IAttendanceAuthAccount.ICreate,
      })
  );
}