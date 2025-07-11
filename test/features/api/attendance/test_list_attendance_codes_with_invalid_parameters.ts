import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";
import type { IPageAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceAttendanceCode";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 출석코드 목록 API (PATCH /attendance/attendanceCodes)에서 유효하지 않은 필터·페이징 파라미터 조합에 대해
 * 서버가 적절하게 422 등 유효성 검사 에러를 반환하는지 검증합니다.
 *
 * ⚠️ 본 테스트는 반드시 정상 인증 계정(권한 있는 토큰)을 선행 생성한 후 진행해야 하며,
 * 다음과 같은 다양한 비정상 케이스(유효하지 않은 파라미터 값)를 개별 요청으로 모두 체크합니다.
 *   - 올바르지 않은 UUID (teacher_id, classroom_id 등)
 *   - 페이지 등 정수값에 대한 음수/0/범위 초과/타입 미스매치
 *   - is_active(boolean)에 대한 잘못된 타입
 *   - 날짜 포맷 문자열에 대한 잘못된 값
 * 각 케이스는 TestValidator.error를 활용하여 에러 발생(422 등)을 검증합니다.
 *
 * 1. 검색 권한이 있는 인증 계정을 생성한다 (attendance/auth/accounts POST)
 * 2. 다양한 비정상 파라미터 조합으로 attendance/attendanceCodes PATCH를 여러 번 호출하며, 각각 에러 발생을 검증한다.
 */
export async function test_api_attendance_test_list_attendance_codes_with_invalid_parameters(
  connection: api.IConnection,
) {
  // 1. 검색 권한을 가진 인증계정 생성
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account);

  // 2.1. 잘못된 teacher_id (UUID 형식 아님)
  await TestValidator.error("invalid teacher_id uuid")(() =>
    api.functional.attendance.attendanceCodes.patch(connection, {
      body: {
        teacher_id: "not-a-uuid",
      } satisfies IAttendanceAttendanceCode.IRequest,
    }),
  );

  // 2.2. 잘못된 classroom_id (UUID 형식 아님)
  await TestValidator.error("invalid classroom_id uuid")(() =>
    api.functional.attendance.attendanceCodes.patch(connection, {
      body: {
        classroom_id: "1234-5678",
      } satisfies IAttendanceAttendanceCode.IRequest,
    }),
  );

  // 2.3. 비정상 boolean (is_active에 문자열 전달)
  await TestValidator.error("is_active: boolean에 문자열 전달")(() =>
    api.functional.attendance.attendanceCodes.patch(connection, {
      body: {
        is_active: "yes" as unknown as boolean,
      } satisfies IAttendanceAttendanceCode.IRequest,
    }),
  );

  // 2.4. 잘못된 날짜 포맷 (issued_from)
  await TestValidator.error("issued_from: 잘못된 날짜 포맷")(() =>
    api.functional.attendance.attendanceCodes.patch(connection, {
      body: {
        issued_from: "not-a-date",
      } satisfies IAttendanceAttendanceCode.IRequest,
    }),
  );

  // 2.5. page에 음수값
  await TestValidator.error("page: 음수값")(() =>
    api.functional.attendance.attendanceCodes.patch(connection, {
      body: {
        page: -1 as number & tags.Type<"int32">,
      } satisfies IAttendanceAttendanceCode.IRequest,
    }),
  );

  // 2.6. limit에 0 (최소 1 이상)
  await TestValidator.error("limit: 0(최소1 이상)")(() =>
    api.functional.attendance.attendanceCodes.patch(connection, {
      body: {
        limit: 0 as number & tags.Type<"int32">,
      } satisfies IAttendanceAttendanceCode.IRequest,
    }),
  );

  // 2.7. page에 문자열 전달 (타입 미스매치)
  await TestValidator.error("page: number여야 하나 string 전달")(() =>
    api.functional.attendance.attendanceCodes.patch(connection, {
      body: {
        page: "one" as unknown as number & tags.Type<"int32">,
      } satisfies IAttendanceAttendanceCode.IRequest,
    }),
  );

  // 2.8. issued_to에 올바르지 않은 날짜 문자열
  await TestValidator.error("issued_to: 올바르지 않은 날짜 포맷")(() =>
    api.functional.attendance.attendanceCodes.patch(connection, {
      body: {
        issued_to: "YYYY-MM-DD 25:61:00",
      } satisfies IAttendanceAttendanceCode.IRequest,
    }),
  );

  // 2.9. teacher_id, classroom_id에 빈 문자열
  await TestValidator.error("teacher_id: 빈 문자열")(() =>
    api.functional.attendance.attendanceCodes.patch(connection, {
      body: {
        teacher_id: "",
      } satisfies IAttendanceAttendanceCode.IRequest,
    }),
  );
  await TestValidator.error("classroom_id: 빈 문자열")(() =>
    api.functional.attendance.attendanceCodes.patch(connection, {
      body: {
        classroom_id: "",
      } satisfies IAttendanceAttendanceCode.IRequest,
    }),
  );
}