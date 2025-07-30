import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import type { IPageIDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 관리자 권한의 advanced subscription 검색/필터/페이징 기능 정상 동작 검증
 *
 * - 다양한 조건(구독자, 대상 타입(topic/thread), 알림방식, 활성/비활성 등)으로 구독 항목을 혼합 생성
 * - PATCH(/discussionBoard/admin/subscriptions)로 각 필터 조건별 & 페이징 조합 검색 요청 수행
 * - 쿼리 결과가 실제 데이터와 정확하게 일치하는지, 잘못된 결과가 노출되지 않는지 확인
 *
 * [테스트 시나리오]
 *
 * 1. 3명의 구독자(user UUID), 2개 topic, 2개 thread, 2종 알림방식(email/in-app) 조합의 구독데이터
 *    생성(POST, 총 24건)
 * 2. 구독자별, 대상타입별, 알림방식별, 활성상태별, 기간별 등 다양한 조건으로 PATCH 검색 시 결과가 정확히 필터링되는지 검증
 * 3. Limit=2로 페이징 쿼리하여 전체 데이터 페이지네이션 결과가 누락/중복 없이 반환되는지 확인
 */
export async function test_api_discussionBoard_admin_subscriptions_test_admin_filter_and_paginate_subscriptions(
  connection: api.IConnection,
) {
  // ---------- 1. 테스트용 다양한 구독 데이터 구성 ----------
  const userIds = ArrayUtil.repeat(3)(() =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const topics = ArrayUtil.repeat(2)(() => ({
    type: "topic" as const,
    id: typia.random<string & tags.Format<"uuid">>(),
  }));
  const threads = ArrayUtil.repeat(2)(() => ({
    type: "thread" as const,
    id: typia.random<string & tags.Format<"uuid">>(),
  }));
  const notificationMethods = ["email", "in-app"];
  const now = new Date();
  const created: IDiscussionBoardSubscription[] = [];
  for (const userId of userIds) {
    for (const target of [...topics, ...threads]) {
      for (const method of notificationMethods) {
        // 활성화 상태 랜덤 분포, 가입시간 최근 ~ 한달 이내 랜덤 시점
        const active = Math.random() < 0.5;
        // 서버에서 subscribed_at을 자동 생성하므로 클라이언트에서 임의 할당 불가
        const subscription =
          await api.functional.discussionBoard.admin.subscriptions.create(
            connection,
            {
              body: {
                subscriber_id: userId,
                target_type: target.type,
                target_id: target.id,
                notification_method: method,
                is_active: active,
              } satisfies IDiscussionBoardSubscription.ICreate,
            },
          );
        created.push(subscription);
      }
    }
  }

  // ---------- 2-a. 구독자별 필터 테스트 ----------
  for (const userId of userIds) {
    const output =
      await api.functional.discussionBoard.admin.subscriptions.search(
        connection,
        {
          body: {
            subscriber_id: userId,
          } satisfies IDiscussionBoardSubscription.IRequest,
        },
      );
    typia.assert(output);
    TestValidator.predicate(`subscriber_id filter works for ${userId}`)(
      output.data.every((row) => row.subscriber_id === userId),
    );
  }

  // ---------- 2-b. 대상 타입별(topic/thread) 필터 테스트 ----------
  for (const targetType of ["topic", "thread"]) {
    const output =
      await api.functional.discussionBoard.admin.subscriptions.search(
        connection,
        {
          body: {
            target_type: targetType,
          },
        },
      );
    typia.assert(output);
    TestValidator.predicate(`target_type filter works for ${targetType}`)(
      output.data.every((row) => row.target_type === targetType),
    );
  }

  // ---------- 2-c. 알림방식별 필터 테스트 ----------
  for (const method of notificationMethods) {
    const output =
      await api.functional.discussionBoard.admin.subscriptions.search(
        connection,
        {
          body: {
            notification_method: method,
          },
        },
      );
    typia.assert(output);
    TestValidator.predicate(`notification_method filter works for ${method}`)(
      output.data.every((row) => row.notification_method === method),
    );
  }

  // ---------- 2-d. 활성/비활성별 필터 테스트 ----------
  for (const isActive of [true, false]) {
    const output =
      await api.functional.discussionBoard.admin.subscriptions.search(
        connection,
        {
          body: {
            is_active: isActive,
          },
        },
      );
    typia.assert(output);
    TestValidator.predicate(`is_active filter works for ${isActive}`)(
      output.data.every((row) => row.is_active === isActive),
    );
  }

  // ---------- 2-e. 기간별(subscribed_at_from ~ to) 필터 테스트 ----------
  const fromDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const toDate = now.toISOString();
  const output =
    await api.functional.discussionBoard.admin.subscriptions.search(
      connection,
      {
        body: {
          subscribed_at_from: fromDate,
          subscribed_at_to: toDate,
        },
      },
    );
  typia.assert(output);
  TestValidator.predicate("7일 이내 가입 구독만 반환")(
    output.data.every(
      (row) => row.subscribed_at >= fromDate && row.subscribed_at <= toDate,
    ),
  );

  // ---------- 3. 페이징 동작 검증 (limit=2)
  const pagingLimit = 2;
  let page = 1;
  const seenIds = new Set<string>();
  while (true) {
    const pageOutput =
      await api.functional.discussionBoard.admin.subscriptions.search(
        connection,
        {
          body: {
            limit: pagingLimit,
            page,
          },
        },
      );
    typia.assert(pageOutput);
    if (pageOutput.data.length === 0) break; // 데이터 끝
    for (const row of pageOutput.data) seenIds.add(row.id);
    page++;
    if (page > 20) break; // 오류 loop 방지용 safety cap
  }
  TestValidator.equals("전체 생성 데이터와 unique id 갯수 일치")(seenIds.size)(
    created.length,
  );
}
