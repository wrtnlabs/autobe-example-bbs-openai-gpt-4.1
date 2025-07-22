import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * 새로운 토론 게시판 채널을 고유 코드와 유효한 이름/설명을 갖고 생성하는 기능을 검증한다.
 *
 * 비즈니스 컨텍스트:
 * - 토론 게시판의 관리자가 고유한 코드(ex. eco, politics 등)와 이름으로 신규 채널(파티션)을 생성한다.
 * - 생성 요청 코드는 사이트 전역에서 유일해야 하며, name 또한 중복 불가(유저 UI용).
 * - description 필드는 관리자 안내/온보딩 등 목적으로 사용된다.
 *
 * [테스트 절차]
 * 1. 고유한 code, name, description 조합으로 채널을 생성한다.
 * 2. 응답값의 각 필드(code, name, description, id, created_at, updated_at, deleted_at 등)와 타입을 검증한다.
 * 3. created_at, updated_at은 ISO8601 date-time 포맷이어야 한다.
 * 4. deleted_at은 생성 직후 null 또는 undefined 이어야 한다.
 * 5. 동일한 code로 채널 생성 시도 시 에러가 발생하는지 검증한다.
 */
export async function test_api_discussionBoard_test_create_channel_with_valid_data(
  connection: api.IConnection,
) {
  // 1. 고유 code, name, description 준비 (실제 생성 테스트)
  const code = `testch${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()}`;
  const name = `E2E채널${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()}`;
  const description = `E2E 자동테스트 - 설명: ${RandomGenerator.paragraph()()}`;

  // 2. 채널 생성 API 호출
  const channel = await api.functional.discussionBoard.channels.post(connection, {
    body: {
      code,
      name,
      description,
    } satisfies IDiscussionBoardChannel.ICreate,
  });
  typia.assert(channel);

  // 3. 응답 필드 및 값 검증
  TestValidator.equals("생성된 code 일치")(channel.code)(code);
  TestValidator.equals("생성된 name 일치")(channel.name)(name);
  TestValidator.equals("생성된 description 일치")(channel.description)(description);
  TestValidator.predicate("id(uuid) 유효성")(!!channel.id && typeof channel.id === "string" && channel.id.length >= 30);
  TestValidator.predicate("created_at 포맷 확인")(!!channel.created_at && channel.created_at.includes("T") && channel.created_at.includes(":"));
  TestValidator.predicate("updated_at 포맷 확인")(!!channel.updated_at && channel.updated_at.includes("T") && channel.updated_at.includes(":"));
  TestValidator.equals("deleted_at 기본 null")(channel.deleted_at ?? null)(null);

  // 4. 동일 code로 중복 생성은 에러여야 함
  await TestValidator.error("중복 code로 생성시 에러 발생")(
    async () => {
      await api.functional.discussionBoard.channels.post(connection, {
        body: {
          code,
          name: name + "-중복",
          description: description + "(중복 테스트)",
        } satisfies IDiscussionBoardChannel.ICreate,
      });
    },
  );
}