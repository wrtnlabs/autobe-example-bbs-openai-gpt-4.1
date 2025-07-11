import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";

/**
 * 관리자 삭제 API의 인증 및 권한 오류 처리 검증
 *
 * 관리자(admin) 계정에 대한 삭제(퇴직/권한말소) 요청 시, 적절한 인증(Bearer 토큰) 없거나, admin 권한이 없는 일반 사용자(교사, 학생 등) 토큰으로 접근할 때 401 Unauthorized 혹은 403 Forbidden 오류가 반환되는지 검증한다.
 *
 * ✅ 주요 검증 포인트
 * 1. 인증 토큰 미포함(Bearer 없음) 상태로 삭제 요청 → 401 또는 403이면 통과, 아니면 반드시 실패
 * 2. 존재하지 않거나 적합하지 않은 권한(일반 권한/교사/학생 등) 토큰으로 삭제 요청 → 403이면 통과, 아니면 반드시 실패
 * ※ 단순히 200/201/204/404와 같이 삭제에 성공하거나, 권한 오류(401/403)가 아니면 치명적 취약점이므로 반드시 테스트가 실패해야 한다.
 *
 * 테스트는 반드시 실패해야 하는 상황만 체크하며, 정상 삭제(200수신)나 NotFound(404) 등은 실패로 간주함
 *
 * @author AutoBE
 */
export async function test_api_attendance_admins_test_delete_admin_without_authorization(
  connection: api.IConnection,
) {
  // 1. Bearer 토큰(Authorization 헤더) 없이 삭제 시도 → 401/403이 반드시 발생해야 성공
  const id: string = typia.random<string & tags.Format<"uuid">>();
  const noAuthConn = { ...connection, headers: { ...connection.headers } };
  delete noAuthConn.headers.Authorization;
  await TestValidator.error("DELETE without Bearer token must fail with 401 or 403")(
    async () => {
      await api.functional.attendance.admins.eraseById(noAuthConn, { id });
    },
  );

  // 2. 일반 권한(교사/학생 등)의 Authorization 헤더로 삭제 시도 → 403이 반드시 발생해야 성공
  //    (본 예시에서는 권한 없는 토큰을 생성할 방법이 없으므로, Authorization 값에 임의의 잘못된 토큰을 넣어서 대체)
  const fakeUserConn = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: "Bearer FAKE_NON_ADMIN_TOKEN",
    },
  };
  await TestValidator.error("DELETE with insufficient privileges must result in 403 Forbidden")(
    async () => {
      await api.functional.attendance.admins.eraseById(fakeUserConn, { id });
    },
  );
}