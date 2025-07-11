import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";
import type { IPageIAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 관리자(Attendance Admin) 계정 목록의 페이징/검색 테스트
 *
 * - 관리자가 여러명 필요하므로 미리 다양한 이름/이메일/학교 조합의 인증계정, 관리자 계정 데이터를 생성한다.
 * - 관리자로 로그인된 상태를 가정한다(별도 인증 API가 없으므로 인증은 생략).
 *
 * 1. (사전 준비) 3명의 관리자 데이터(이름/이메일 3종, 학교 2종(1명은 school_id: null)) 생성
 * 2. 이름, 이메일, 소속(학교)별 필터 케이스로 목록을 요청해 각 필터가 정상 동작하는지 확인
 * 3. 페이지 limit=1, limit=2 등 다양한 limit별 페이징으로 pagination block의 일관성도 검증
 * 4. 검색 파라미터 모두 누락 시 전체 목록이 반환되는지 확인
 * 5. 존재하지 않는 이름/이메일로 검색하면 결과가 빈 배열이어야 함을 확인
 * 6. 숫자범위 벗어난 limit 등 이상 파라미터에서 유효성 오류 발생 확인
 * 7. (권한) 미인가 사용자의 접근 시도를 가정하여, 권한 에러가 발생하는지 TestValidator.error로 확인한다.
 */
export async function test_api_attendance_test_list_admins_with_valid_pagination_and_search(
  connection: api.IConnection,
) {
  // 1. 테스트용 관리자 계정 3명 (school_id 2종+null, 각기 다른 name/email) 사전 생성
  //    - admin1: 홍길동 / hong1@school.com / school_id1
  //    - admin2: 김철수 / kim2@school.com / school_id1
  //    - admin3: 박영희 / park3@school.com / 없음(null)
  
  const schoolId1 = typia.random<string & tags.Format<'uuid'>>();

  // 인증 계정 및 관리자 생성
  const authAccount1 = await api.functional.attendance.auth.accounts.post(connection, {
    body: { email: 'hong1@school.com', password_hash: 'hash1' },
  });
  const admin1 = await api.functional.attendance.admins.post(connection, {
    body: { school_id: schoolId1, auth_account_id: authAccount1.id, name: '홍길동', email: 'hong1@school.com' },
  });

  const authAccount2 = await api.functional.attendance.auth.accounts.post(connection, {
    body: { email: 'kim2@school.com', password_hash: 'hash2' },
  });
  const admin2 = await api.functional.attendance.admins.post(connection, {
    body: { school_id: schoolId1, auth_account_id: authAccount2.id, name: '김철수', email: 'kim2@school.com' },
  });

  const authAccount3 = await api.functional.attendance.auth.accounts.post(connection, {
    body: { email: 'park3@school.com', password_hash: 'hash3' },
  });
  const admin3 = await api.functional.attendance.admins.post(connection, {
    body: { school_id: undefined, auth_account_id: authAccount3.id, name: '박영희', email: 'park3@school.com' },
  });

  // 2. 이름 필터로 '홍길동' 검색: 한 명만 검색되어야 함
  let page = await api.functional.attendance.admins.patch(connection, { body: { name: '홍길동' } });
  typia.assert(page);
  TestValidator.equals('이름 검색')(
    page.data.map((adm) => adm.id),
  )([admin1.id]);

  // 3. 이메일 필터로 'kim2@school.com' 검색
  page = await api.functional.attendance.admins.patch(connection, { body: { email: 'kim2@school.com' } });
  typia.assert(page);
  TestValidator.equals('이메일 검색')(page.data.map((adm) => adm.id))([admin2.id]);

  // 4. school_id 필터(schoolId1) => admin1, admin2만 검색되어야 함
  page = await api.functional.attendance.admins.patch(connection, { body: { school_id: schoolId1 } });
  typia.assert(page);
  TestValidator.equals('school_id 검색')(
    page.data
      .map((adm) => adm.id)
      .sort(),
  )([
    admin1.id,
    admin2.id,
  ].sort());

  // 5. 페이지 limit=1로 요청: 한 명만 반환, 전체 records/pagination 및 3명의 합이 맞는지 확인
  page = await api.functional.attendance.admins.patch(connection, { body: { limit: 1 } });
  typia.assert(page);
  TestValidator.equals('limit=1 반환')(
    page.data.length,
  )(1);
  TestValidator.equals('총합=3')(page.pagination.records)(3);
  TestValidator.equals('총 페이지=3')(page.pagination.pages)(3);

  // limit=2
  page = await api.functional.attendance.admins.patch(connection, { body: { limit: 2 } });
  typia.assert(page);
  TestValidator.equals('limit=2 반환')(page.data.length)(2);
  TestValidator.equals('총합=3')(page.pagination.records)(3);
  TestValidator.equals('총페이지=2')(page.pagination.pages)(2);

  // 6. 필터파라미터 완전 미입력 (빈 오브젝트) 시 전체 목록
  page = await api.functional.attendance.admins.patch(connection, { body: {} });
  typia.assert(page);
  TestValidator.equals('전체 목록 3명')(page.data.length)(3);

  // 7. 없는 이름 검색 - 빈 배열
  page = await api.functional.attendance.admins.patch(connection, { body: { name: '없는이름' } });
  typia.assert(page);
  TestValidator.equals('존재하지 않는 이름')(page.data.length)(0);

  // 8. 없는 이메일 검색 - 빈 배열
  page = await api.functional.attendance.admins.patch(connection, { body: { email: 'nope@email.com' } });
  typia.assert(page);
  TestValidator.equals('존재하지 않는 이메일')(page.data.length)(0);

  // 9. invalid limit(0) 등 이상 파라미터: error 발생해야 함
  await TestValidator.error('limit=0 오류')(async () => {
    await api.functional.attendance.admins.patch(connection, { body: { limit: 0 } });
  });
  await TestValidator.error('limit=1001 오류')(async () => {
    await api.functional.attendance.admins.patch(connection, { body: { limit: 1001 } });
  });
  
  // 10. (권한) 미인가 role connection에서 patch 요청 시 error
  const unauthConnection = { ...connection, headers: { ...connection.headers, Authorization: '' } };
  await TestValidator.error('미인가 사용자의 접근')(
    async () => {
      await api.functional.attendance.admins.patch(unauthConnection as api.IConnection, { body: {} });
    },
  );
}