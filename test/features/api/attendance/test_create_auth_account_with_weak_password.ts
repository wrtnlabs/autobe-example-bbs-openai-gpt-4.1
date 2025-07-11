import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 패스워드 정책 위반 시 인증계정 생성 실패 확인
 *
 * 패스워드가 정책상 요구 조건(길이, 문자조합 등)을 충족하지 않는 경우,
 * 신규 인증계정 등록이 실패(ValidationError 등)해야 함을 검증하는 테스트입니다.
 *
 * **주요 절차:**
 * 1. 유니크한 이메일, 취약한(너무 짧거나 단순한) password_hash로 IAttendanceAuthAccount.ICreate 입력값 준비
 * 2. API를 통해 계정 생성 시도
 * 3. 정상적으로 계정이 생성되면 테스트 실패 처리
 * 4. 에러(실패)가 일어나면 테스트 성공(단, 에러 메시지 구체 검증은 스킵)
 */
export async function test_api_attendance_auth_accounts_test_create_auth_account_with_weak_password(
  connection: api.IConnection,
) {
  // 1. 유니크한 이메일, 취약한 패스워드로 입력값 준비
  const email: string & tags.Format<"email"> = typia.random<string & tags.Format<"email">>();
  const weakPassword: string = "123"; // 정책상 불충분한 예시(너무 짧음)

  const input: IAttendanceAuthAccount.ICreate = {
    email,
    password_hash: weakPassword,
  };

  // 2. 계정 생성 시도 → 반드시 에러가 발생해야 함
  await TestValidator.error("패스워드가 약할 때 가입 실패해야 함")(
    async () => {
      await api.functional.attendance.auth.accounts.post(connection, {
        body: input,
      });
    },
  );
}