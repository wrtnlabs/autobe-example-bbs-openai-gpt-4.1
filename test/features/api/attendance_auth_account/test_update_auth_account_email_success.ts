import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 인증계정 이메일 변경 성공 플로우 검증
 *
 * - 인증계정을 먼저 생성하고,
 * - 적절한 권한(테스트 목적상 시뮬레이션 또는 assume 권한)으로 해당 계정의 이메일을 유니크한 정상 이메일로 변경 요청 시도
 * - 응답에 이메일이 정상적으로 변경되었는지, 결과 오브젝트에 반영되었는지를 assert
 *
 * 절차
 * 1. 신규 인증계정 생성 (이메일1, 임의 hash)
 * 2. 신규 유니크 이메일2 준비
 * 3. putById로 이메일을 이메일2로 변경
 * 4. 반환 결과의 email이 기대값(이메일2)과 일치하는지 검증
 */
export async function test_api_attendance_auth_account_test_update_auth_account_email_success(
  connection: api.IConnection,
) {
  // 1. 신규 인증계정 생성
  const email1 = typia.random<string & tags.Format<"email">>();
  const passwordHash = typia.random<string>(); // 실제 hash가 아님에 유의 (테스트 목적)
  const created = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: email1,
      password_hash: passwordHash,
    }
  });
  typia.assert(created);

  // 2. 유니크 신규 이메일 생성
  let email2 = typia.random<string & tags.Format<"email">>();
  // email1과 다를 때까지 재시도(희박하게 중복될 가능성 방지)
  while(email2 === email1) {
    email2 = typia.random<string & tags.Format<"email">>();
  }

  // 3. 이메일 변경 호출
  const updated = await api.functional.attendance.auth.accounts.putById(connection, {
    id: created.id,
    body: {
      email: email2
    }
  });
  typia.assert(updated);

  // 4. 결과 검증 - 이메일이 정상 변경되었는지 assert
  TestValidator.equals("이메일 변경됨")(updated.email)(email2);
}