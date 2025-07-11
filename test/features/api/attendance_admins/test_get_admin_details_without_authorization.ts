import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";

/**
 * 관리자 상세정보 API 권한 오류 케이스 검증
 *
 * 인증 토큰 미포함(비로그인) 또는 admin 권한이 없는 사용자(학생/교사 등)로 /attendance/admins/{id} GET
 * 호출 시 401 Unauthorized 또는 403 Forbidden 에러가 적절히 반환되는지 확인합니다.
 *
 * [테스트 시나리오]
 * 1. 인증 토큰 없이(즉, 비로그인 상태) 관리자 상세 정보 조회 시도 → 401/403 오류 발생 확인
 * 2. 학생 혹은 교사(즉, 관리자가 아닌 사용자) 권한으로 로그인 후 동일 API 접근 시도 → 403 오류 발생 확인
 *
 * 각 케이스에서
 * - 정상적인 IAttendanceAdmin 객체가 반환되지 않으며
 * - typia.is<HttpError>(err)가 true인지,
 * - err.status가 401 또는 403임을 확인
 * - (개별 오류 메시지/구조는 검증하지 않음)
 */
export async function test_api_attendance_admins_test_get_admin_details_without_authorization(
  connection: api.IConnection,
) {
  // 1. 인증 토큰 없이 비로그인 상태에서 관리자 상세조회 시도
  await TestValidator.error("비로그인 상태에서 관리자 상세조회는 401/403 에러가 발생해야 함")(
    async () => {
      try {
        await api.functional.attendance.admins.getById(
          { ...connection, headers: {} },
          { id: typia.random<string & tags.Format<"uuid">>() },
        );
      } catch (err) {
        if (typia.is<{ status: number }>(err)) {
          TestValidator.predicate("에러는 HttpError 타입이어야 함")(true);
          TestValidator.predicate("status가 401 또는 403임")(err.status === 401 || err.status === 403);
        } else {
          TestValidator.predicate("에러는 HttpError 타입이어야 함")(false);
        }
        throw err;
      }
    },
  );

  // 2. 권한 없는 계정(학생/교사 등)으로 로그인하여 접근
  // 실제로 비관리자(학생/교사) 사용자 인증 토큰이 있다면 사용해야 하겠지만, 여기선 예시적으로 임의의 허위 토큰 값을 부여함
  await TestValidator.error("학생/교사 등 관리자가 아닌 권한으로 접근 시 403 에러가 발생해야 함")(
    async () => {
      try {
        await api.functional.attendance.admins.getById(
          { ...connection, headers: { Authorization: "Bearer FORBIDDEN" } },
          { id: typia.random<string & tags.Format<"uuid">>() },
        );
      } catch (err) {
        if (typia.is<{ status: number }>(err)) {
          TestValidator.predicate("에러는 HttpError 타입이어야 함")(true);
          TestValidator.predicate("status가 401 또는 403임")(err.status === 401 || err.status === 403);
        } else {
          TestValidator.predicate("에러는 HttpError 타입이어야 함")(false);
        }
        throw err;
      }
    },
  );
}