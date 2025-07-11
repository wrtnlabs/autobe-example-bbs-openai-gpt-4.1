import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";

/**
 * 관리자 정보 수정 권한 오류(비인증/비권한) 검증
 *
 * 인증 토큰이 없거나, 관리자 권한이 없는 상태에서
 * /attendance/admins/{id} 엔드포인트로 PUT 요청을 시도했을 때
 * 401(Unauthorized) 또는 403(Forbidden)과 같은 권한/인증 관련 오류가 발생함을 확인합니다.
 *
 * - 이 테스트는 올바른 인증/권한 검증 로직이 애플리케이션에 적용되어 있는지 점검합니다.
 * - 테스트는 인증 토큰을 포함하지 않은 connection 객체 사용하여 실행합니다.
 * - 오류 응답의 상세 메시지나 타입까지 확인하진 않고,
 *   오류가 throw되는지(실패가 발생하는지) 여부만 검증하여, 권한 체크 동작 여부를 테스트합니다.
 *
 * [진행 절차]
 * 1. 임의의(존재하지 않을 수도 있는) 관리자 UUID와 Update body 구성
 * 2. 인증 정보 없이 putById API를 호출
 * 3. TestValidator.error로 오류(response가 throw) 발생 유무 체크
 */
export async function test_api_attendance_admins_test_update_admin_info_without_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. 임의 관리자 id/수정 내용 body 생성
  const randomId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = typia.random<IAttendanceAdmin.IUpdate>();

  // 2. 비인증 connection으로 put 요청 시도 (권한 오류 발생 검증)
  await TestValidator.error("미인증(권한없음) 관리자 수정 시도")(async () => {
    await api.functional.attendance.admins.putById(connection, {
      id: randomId,
      body: updateBody,
    });
  });
}