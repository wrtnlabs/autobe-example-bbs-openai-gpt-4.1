import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";

/**
 * 존재하지 않는 관리자 id로 상세 정보 조회 시 404 Not Found 오류를 반환하는지 검증합니다.
 *
 * - 해당 테스트는 /attendance/admins/{id} 엔드포인트에 존재하지 않는(UUID 랜덤 생성) id로 접근 시 정상적으로 404 에러가 발생하는지를 확인합니다.
 * - 인증/권한 선행 절차 없이 바로 호출하며, 실제 데이터베이스에 존재하지 않는 uuid를 이용해 호출합니다.
 * - TestValidator.error("not found")(...)를 이용해 HttpError가 발생하는지 검증하며, 추가적인 반환값이나 메시지 확인은 하지 않습니다.
 *
 * 1. 존재하지 않는 무작위 UUID를 생성합니다.
 * 2. 해당 UUID로 관리자 상세조회 API를 호출하며, 404 에러가 throw되는지 확인합니다.
 */
export async function test_api_attendance_admins_test_get_admin_details_with_not_found_id(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 무작위 UUID 생성
  const notFoundId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();

  // 2. 존재하지 않는 id로 상세조회 시 404 Not Found 에러 발생 검증
  await TestValidator.error("not found")(async () => {
    await api.functional.attendance.admins.getById(connection, {
      id: notFoundId,
    });
  });
}