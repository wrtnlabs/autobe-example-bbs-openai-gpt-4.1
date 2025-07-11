import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";
import type { IPageIAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 인증/권한 없는 사용자의 관리자 리스트 조회 실패 테스트
 *
 * /attendance/admins PATCH 엔드포인트에 대해 아래와 같은 인증 및 권한 실패 케이스를 검증합니다.
 *
 * 1. 인증 토큰 없이 관리자 리스트 조회를 시도하면 401 Unauthorized(미인증) 에러가 반환되어야 합니다.
 * 2. 관리자 권한이 없는 계정(예: 교사, 학부모, 학생)이 접근할 경우 403 Forbidden(권한 부족) 에러가 반환되어야 합니다. (단, 해당 계정 생성/로그인 API 미제공 시 이 부분은 구현하지 않습니다)
 *
 * 테스트에서는 인증 없이 요청하는 케이스만 구현합니다. (계정 생성/로그인 API 미제공)
 * body는 IAttendanceAdmin.IRequest 타입의 랜덤값을 사용합니다.
 */
export async function test_api_attendance_test_list_admins_without_authorization(
  connection: api.IConnection,
) {
  // 1. 인증 없이 관리자 조회 시도 (Authorization header 제거)
  const _conn = { ...connection, headers: { ...connection.headers } };
  delete _conn.headers.Authorization;
  await TestValidator.error("인증 없이 관리자 조회 시 401 오류 반환 여부")(
    async () => {
      await api.functional.attendance.admins.patch(_conn, {
        body: typia.random<IAttendanceAdmin.IRequest>(),
      });
    },
  );

  // 2. (Optional, 계정 생성/로그인 API 제공 시) 관리자 권한 없는 유저로 로그인 후 시도
  // (현재 SDK 내 해당 API 부재로 구현하지 않음)
}