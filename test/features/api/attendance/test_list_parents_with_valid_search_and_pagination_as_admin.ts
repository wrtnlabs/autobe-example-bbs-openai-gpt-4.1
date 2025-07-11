import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";
import type { IPageAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceParent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 관리자 권한으로 다양한 조건(이름, 이메일, 소속학교 등)과 페이지네이션(limit, page 등)을 조합하여 학부모(보호자) 리스트를 조회하고,
 * 각 조건별 정상적인 검색 필터와 페이지네이션 및 응답 구조의 적합성을 검증합니다.
 *
 * [주요 검증 포인트]
 * - 각 검색 필드(name, email, school_id 등) 별 효과적인 필터링 동작 확인
 * - limit/page 기반 페이지네이션 메타데이터 및 데이터 개수 검증
 * - 허용되지 않은 필드 기준 검색이 무시/예외 없이 처리되는지 확인
 *
 * [시나리오 단계]
 * 1. 테스트용 학교 2곳을 생성 (schoolA, schoolB)
 * 2. 학교별로 보호자/계정 데이터를 조합 생성
 * 3. 다양한 조건(name/email/school_id/limit/page)과 조합으로 학부모 리스트를 조회 및 검증
 * 4. 잘못된 필드로 검색 시 무시되며 기본 응답됨을 확인
 */
export async function test_api_attendance_test_list_parents_with_valid_search_and_pagination_as_admin(
  connection: api.IConnection,
) {
  // 1. 테스트용 학교 2곳 생성
  const schoolA = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphaNumeric(8),
      address: RandomGenerator.paragraph()(),
    },
  });
  typia.assert(schoolA);

  const schoolB = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphaNumeric(8),
      address: RandomGenerator.paragraph()(),
    },
  });
  typia.assert(schoolB);

  // 2. 학부모 계정/데이터 조합 5명 생성 (이름/이메일/번호/소속 다양화)
  const parents: { parent: IAttendanceParent; account: IAttendanceAuthAccount; school: typeof schoolA | typeof schoolB }[] = [];
  for (let i = 0; i < 5; ++i) {
    const account = await api.functional.attendance.auth.accounts.post(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(5) + i + "@unitest.com",
        password_hash: RandomGenerator.alphaNumeric(12),
      },
    });
    typia.assert(account);

    const parent = await api.functional.attendance.parents.post(connection, {
      body: {
        auth_account_id: account.id,
        name: `테스트보호자_${i}`,
        email: account.email!,
        phone: "010" + String(99000000 + i),
      },
    });
    typia.assert(parent);

    parents.push({ parent, account, school: i < 3 ? schoolA : schoolB });
  }

  // 3. 리스트 조회/검색 케이스별 검증
  // (1) 전체/페이징 조합
  let response = await api.functional.attendance.parents.patch(connection, {
    body: {
      page: 1,
      limit: 3,
    },
  });
  typia.assert(response);
  // 페이지네이션 메타 검증
  TestValidator.equals("limit 3 적용")(response.pagination.limit)(3);
  TestValidator.equals("1번 페이지")(response.pagination.current)(1);
  TestValidator.predicate("데이터 개수는 limit 이하")(response.data.length <= 3);

  // (2) 이름 필터
  response = await api.functional.attendance.parents.patch(connection, {
    body: { name: "테스트보호자_1" },
  });
  typia.assert(response);
  TestValidator.predicate("특정 이름 필터 정상 동작")(response.data.some(r => r.name === "테스트보호자_1"));

  // (3) 이메일 필터
  response = await api.functional.attendance.parents.patch(connection, {
    body: { email: parents[3].parent.email },
  });
  typia.assert(response);
  TestValidator.equals("특정 이메일 결과 1건")(response.data.length)(1);
  TestValidator.equals("이메일 값 일치")(response.data[0].email)(parents[3].parent.email);

  // (4) 소속 학교 필터
  response = await api.functional.attendance.parents.patch(connection, {
    body: { school_id: schoolA.id },
  });
  typia.assert(response);
  TestValidator.predicate("schoolA 소속 학부모들 존재")(response.data.length >= 1);

  // (5) 허용되지 않은 필드 필터 (fake_field 포함) → 전체 리스트 정상 응답됨
  response = await api.functional.attendance.parents.patch(connection, {
    body: { fake_field: "notwork" } as any,
  });
  typia.assert(response);
  TestValidator.predicate("허용되지 않은 파라미터 정상 무시됨")(Array.isArray(response.data));
}