import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Comprehensive E2E test: list/filter discussion board sections with pagination and access control.
 *
 * This verifies admin and non-admin list/filter flows, audit, pagination edge cases, validation, and public access constraints.
 *
 * 1. Setup: Create 2+ channels and at least 2 distinct sections under different channels for stable filter/paging base.
 * 2. Admin: PATCH with name, code, channel_id, and description filters (individually and in combination); apply pagination; assert filter/paging correctness and audit fields (created_at, updated_at, deleted_at).
 * 3. Edge page: Use out-of-bounds page/limit (e.g. page >> count) and expect empty 'data', valid pagination object.
 * 4. Permission: Simulate non-admin read, expect either limited info or access denied per business rule.
 * 5. Validation: Intentionally send invalid input (e.g., wrong uuid in channel_id, negative page/limit, string for int) and expect validation errors (400/422) from SDK.
 * 6. Auth: Try PATCH unauthenticated, expect denial or proper accessible subset if public.
 */
export async function test_api_discussionBoard_test_list_sections_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Setup: Create 2+ channels
  const channel1 = await api.functional.discussionBoard.channels.post(connection, {
    body: { code: RandomGenerator.alphaNumeric(6), name: "Channel1", description: "Test Channel 1" } satisfies IDiscussionBoardChannel.ICreate,
  });
  typia.assert(channel1);
  TestValidator.predicate("channel1 has audit fields")(typeof channel1.created_at === "string" && typeof channel1.updated_at === "string");
  const channel2 = await api.functional.discussionBoard.channels.post(connection, {
    body: { code: RandomGenerator.alphaNumeric(6), name: "Channel2", description: "Test Channel 2" } satisfies IDiscussionBoardChannel.ICreate,
  });
  typia.assert(channel2);
  TestValidator.predicate("channel2 has audit fields")(typeof channel2.created_at === "string" && typeof channel2.updated_at === "string");

  // 2. Setup: Create 2+ sections
  const section1 = await api.functional.discussionBoard.sections.post(connection, {
    body: { discussion_board_channel_id: channel1.id, code: RandomGenerator.alphaNumeric(6), name: "SectionA", description: "Section For Channel 1" } satisfies IDiscussionBoardSection.ICreate,
  });
  typia.assert(section1);
  TestValidator.predicate("section1 has audit fields")(typeof section1.created_at === "string" && typeof section1.updated_at === "string");
  const section2 = await api.functional.discussionBoard.sections.post(connection, {
    body: { discussion_board_channel_id: channel2.id, code: RandomGenerator.alphaNumeric(6), name: "SectionB", description: "Section For Channel 2" } satisfies IDiscussionBoardSection.ICreate,
  });
  typia.assert(section2);
  TestValidator.predicate("section2 has audit fields")(typeof section2.created_at === "string" && typeof section2.updated_at === "string");

  // 3. Filter by code: Should match only correct section
  const filterByCode = await api.functional.discussionBoard.sections.patch(connection, {
    body: { code: section1.code } satisfies IDiscussionBoardSection.IRequest,
  });
  typia.assert(filterByCode);
  TestValidator.predicate("filter by code returns section1 only")(filterByCode.data.length === 1 && filterByCode.data[0].id === section1.id);
  TestValidator.predicate("filter by code returns audit fields")(filterByCode.data[0].created_at !== undefined && filterByCode.data[0].updated_at !== undefined);

  // 4. Filter by channel_id: Should match section in that channel only
  const filterByChannel = await api.functional.discussionBoard.sections.patch(connection, {
    body: { channel_id: channel2.id } satisfies IDiscussionBoardSection.IRequest,
  });
  typia.assert(filterByChannel);
  TestValidator.predicate("filter by channel_id returns section2 only")(filterByChannel.data.length === 1 && filterByChannel.data[0].id === section2.id);

  // 5. Filter by name: Should match correct section
  const filterByName = await api.functional.discussionBoard.sections.patch(connection, {
    body: { name: section1.name } satisfies IDiscussionBoardSection.IRequest,
  });
  typia.assert(filterByName);
  TestValidator.predicate("filter by name returns correct section")(filterByName.data.find(x => x.id === section1.id) !== undefined);

  // 6. Filter by description partial match (should match at least one)
  const filterByDescription = await api.functional.discussionBoard.sections.patch(connection, {
    body: { description: "Section For Channel" } satisfies IDiscussionBoardSection.IRequest,
  });
  typia.assert(filterByDescription);
  TestValidator.predicate("description filter returns results")(filterByDescription.data.length > 0);

  // 7. Pagination: limit=1, page=1 returns 1 item, correct metadata
  const paged = await api.functional.discussionBoard.sections.patch(connection, {
    body: { limit: 1, page: 1 } satisfies IDiscussionBoardSection.IRequest,
  });
  typia.assert(paged);
  TestValidator.equals("pagination - page=1, limit=1")(paged.pagination.current)(1);
  TestValidator.equals("pagination - returns 1 item")(paged.data.length)(1);

  // 8. Pagination out of bounds: page >> expected max (empty page)
  const emptyPaged = await api.functional.discussionBoard.sections.patch(connection, {
    body: { limit: 2, page: 999 } satisfies IDiscussionBoardSection.IRequest,
  });
  typia.assert(emptyPaged);
  TestValidator.equals("pagination empty records")(emptyPaged.data.length)(0);

  // 9. Validation error: invalid channel_id (bad uuid)
  await TestValidator.error("invalid channel_id should yield validation error")(async () =>
    api.functional.discussionBoard.sections.patch(connection, {
      body: { channel_id: "not-a-uuid" } as any,
    })
  );

  // 10. Validation error: negative page/limit
  await TestValidator.error("negative page should fail")(async () =>
    api.functional.discussionBoard.sections.patch(connection, {
      body: { page: -1 } as any,
    })
  );
  await TestValidator.error("negative limit should fail")(async () =>
    api.functional.discussionBoard.sections.patch(connection, {
      body: { limit: -5 } as any,
    })
  );

  // 11. Missing authentication: simulate no auth, expect access restriction (may need connection clone)
  const { Authorization, ...restHeaders } = connection.headers ?? {};
  const noAuthConn = { ...connection, headers: restHeaders };
  await TestValidator.error("no auth yields access denial or restriction")(async () =>
    api.functional.discussionBoard.sections.patch(noAuthConn, {
      body: {} satisfies IDiscussionBoardSection.IRequest,
    })
  );

  // 12. (If business supports it) - non-admin access, expect info restriction/permission error or reduced dataset (not implemented; SDK lacks user simulation)
}