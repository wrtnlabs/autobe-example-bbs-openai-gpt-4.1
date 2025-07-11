import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthSession";
import type { IPageIAttendanceAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceAuthSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 인증 세션 리스트 조회 API의 파라미터 검증 실패 케이스를 테스트합니다.
 *
 * [비즈니스 목적]
 * - 내부 인증세션 검색(목록) API에 대하여, 각 파라미터가 비정상 혹은 정책에 어긋나는 값을
 *   받을 때 400/422 등 적절한 에러가 정상적으로 리턴되는지 검증합니다.
 *
 * [프로세스]
 * 1. 테스트용 인증계정(account) 생성 (사전 의존성)
 * 2. 다양한 잘못된 파라미터로 세션 목록 API 호출 후 모두 예외가 발생하는지 검증
 *   - 잘못된 UUID (auth_account_id)
 *   - page 음수/0/타입 이상 값
 *   - limit 지나치게 큰 값/타입 이상 값
 *   - session_token 과도하게 긴 문자열
 *
 * 각 테스트 케이스 별 상세 메시지와 함께 예외발생(assertion) 검증 실시
 */
export async function test_api_attendance_test_list_auth_sessions_with_invalid_parameters(
  connection: api.IConnection,
) {
  // 1. 사전 - 테스트용 인증 계정 생성
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "dummy_hash_value",
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account);

  // 2-1. 잘못된 UUID (auth_account_id)
  await TestValidator.error("잘못된 UUID는 400/422 오류를 발생해야 한다")(async () => {
    await api.functional.attendance.auth.sessions.patch(connection, {
      body: {
        auth_account_id: "not-a-uuid",
      },
    });
  });

  // 2-2. 음수/0 등 잘못된 page
  await TestValidator.error("음수 page는 400/422")(async () => {
    await api.functional.attendance.auth.sessions.patch(connection, {
      body: {
        page: -1 as number & tags.Type<"int32">,
      },
    });
  });
  await TestValidator.error("0 page는 400/422")(async () => {
    await api.functional.attendance.auth.sessions.patch(connection, {
      body: {
        page: 0 as number & tags.Type<"int32">,
      },
    });
  });

  // 2-3. 너무 큰 limit
  await TestValidator.error("limit이 너무 큼 = 9999999")(async () => {
    await api.functional.attendance.auth.sessions.patch(connection, {
      body: {
        limit: 9999999 as number & tags.Type<"int32">,
      },
    });
  });

  // 2-4. 부적절한 session_token 값
  await TestValidator.error("session_token 필드가 너무 김")(async () => {
    await api.functional.attendance.auth.sessions.patch(connection, {
      body: {
        session_token: "a".repeat(3000),
      },
    });
  });

  // 2-5. page/limit 타입 오류 (string 값 등)
  await TestValidator.error("page에 string 주입 시 오류")(async () => {
    await api.functional.attendance.auth.sessions.patch(connection, {
      body: {
        // @ts-expect-error
        page: "one",
      },
    });
  });
  await TestValidator.error("limit에 string 주입 시 오류")(async () => {
    await api.functional.attendance.auth.sessions.patch(connection, {
      body: {
        // @ts-expect-error
        limit: "two",
      },
    });
  });
}