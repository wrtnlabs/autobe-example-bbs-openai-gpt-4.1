import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSocialAccount";
import type { IPageIAttendanceSocialAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceSocialAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 소셜 계정 목록 조회 API의 보안 접근 제어 검증
 *
 * 인증되지 않았거나(로그인 세션 없이 접근, 만료 토큰, 잘못된 토큰 등), 혹은 인가되지 않은 권한(예: 일반 학생이 관리자 권한 기능 접근, 또는 무권한 외부 사용자)의 경우
 * 소셜 계정 매핑 리스트 조회 API(`/attendance/auth/socialAccounts`, PATCH)를 호출시 401(Unauthorized) 또는 403(Forbidden) 에러가 발생하는지 테스트합니다.
 *
 * 이 테스트는 잠재적 보안 취약점(권한 없는 사용자/잘못된 인증 상태에서 내부 계정, 소셜 계정 매핑 정보를 불법 조회하는 케이스)을 점검하기 위함입니다.
 *
 * [검증 시나리오]
 * 1. 인증 세션 없는 커넥션(Authorization 없이)에서 API 호출 시 401 에러가 발생하는지 확인
 * 2. 토큰이 잘못되었거나 만료된 커넥션에서 호출시 401 에러가 발생하는지 확인
 * 3. 권한 없는 사용자(예: 학생 계정, 부모 계정 등)가 접근 시 403 에러가 발생하는지 확인 (구현 가능한 경우)
 */
export async function test_api_attendance_test_list_social_accounts_access_denied_for_unauthorized(
  connection: api.IConnection,
) {
  // 1. 인증 세션 없는 커넥션 (Authorization 헤더 없음)
  const noAuthConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers }
  };
  delete noAuthConnection.headers?.Authorization;

  // 임의의 (실제 존재하지 않아도 되는) 필터 파라미터 구성
  const body: IAttendanceSocialAccount.IRequest = {};

  await TestValidator.error("401 Unauthorized: 인증 없이 접근시 에러 발생해야 함")(
    async () => {
      await api.functional.attendance.auth.socialAccounts.patch(noAuthConnection, { body });
    },
  );

  // 2. 잘못되거나 만료된 토큰의 커넥션
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: "Bearer invalid_or_expired_token"
    }
  };

  await TestValidator.error("401 Unauthorized: 잘못된/만료 토큰")(
    async () => {
      await api.functional.attendance.auth.socialAccounts.patch(invalidTokenConnection, { body });
    },
  );

  // 3. 권한이 없는 경우 (권한 없는 역할 예시: 학생)
  // (만약 테스트 환경 및 api에 예시 학생/부모 로그인 API가 구현되어 있다면 아래처럼 로그인 후 접근 시도)
  // const studentConnection = await loginAsStudent(connection);
  // await TestValidator.error("403 Forbidden: 학생 계정 접근 거부 확인")(
  //   async () => {
  //     await api.functional.attendance.auth.socialAccounts.patch(studentConnection, { body });
  //   },
  // );
}