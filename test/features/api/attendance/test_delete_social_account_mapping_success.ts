import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSocialAccount";

/**
 * 소셜 계정 맵핑 row의 정상 삭제 기능 검증 E2E 테스트.
 *
 * 본 테스트는 사용자가 직접 추가한 소셜 연동 정보를 삭제할 때 및 관리자가 계정의 연동 정보를 삭제할 때의 내부 동작을 검증한다.
 *
 * [테스트 시나리오]
 * 1. 인증 계정을 신규로 생성(테스트 대상 계정 준비)
 * 2. 준비된 계정으로 소셜 계정 매핑 row를 추가(삭제 대상 생성)
 * 3. 추가된 social_account row의 UUID로 삭제 요청(본인 또는 관리자)
 * 4. 삭제 성공 : 올바른 삭제(204 또는 삭제Snapshot 응답)
 * 5. 삭제된 UUID로 재조회 시 존재하지 않거나 삭제(tombstone) 상태 반환 확인
 *
 * [비즈니스 로직 체크 포인트]
 * - 본인 또는 관리자가 정상적으로 소셜 row를 삭제할 수 있어야 함
 * - 삭제 완료 시 해당 UUID로의 연동이 불가해야 함(추가 실제 연동 검증은 별도 E2E에서 실행 가능)
 * - 삭제 응답 형태(삭제 snapshot 등) 및 HTTP status 코드가 예상과 일치하는지 검증.
 */
export async function test_api_attendance_test_delete_social_account_mapping_success(
  connection: api.IConnection,
) {
  // 1. 인증 계정 생성
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashedpassword1234",
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authAccount);

  // 2. 소셜 계정 매핑 row 추가
  const provider = "google";
  const social_id = `testuser_socialid_${Math.floor(Math.random()*100000)}`;
  const socialAccount = await api.functional.attendance.auth.socialAccounts.post(connection, {
    body: {
      auth_account_id: authAccount.id,
      provider,
      social_id,
    } satisfies IAttendanceSocialAccount.ICreate,
  });
  typia.assert(socialAccount);
  TestValidator.equals("생성된 소셜계정 매핑의 auth_account_id 일치")(socialAccount.auth_account_id)(authAccount.id);
  TestValidator.equals("생성된 소셜계정 매핑의 provider 일치")(socialAccount.provider)(provider);
  TestValidator.equals("생성된 소셜계정 매핑의 social_id 일치")(socialAccount.social_id)(social_id);

  // 3. 소셜 계정 매핑 삭제 시도 (본인 자격)
  const deletedSocialAccount = await api.functional.attendance.auth.socialAccounts.eraseById(connection, {
    id: socialAccount.id,
  });
  typia.assert(deletedSocialAccount);
  // 삭제된 소셜 row가 삭제 엔터티/스냅샷이 되었는지 확인 (deletedSocialAccount 반환값 활용)

  // 4. 동일 UUID 조회 시 tombstone 상태(삭제되었음) 또는 미존재 처리되는지 검증(예상: 예외 발생)
  await TestValidator.error("삭제된 소셜계정 매핑 조회는 실패해야 함")(
    async () => {
      await api.functional.attendance.auth.socialAccounts.eraseById(connection, {
        id: socialAccount.id,
      });
    }
  );
}