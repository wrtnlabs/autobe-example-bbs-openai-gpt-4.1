import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IPageIDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBan";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for listing discussion board bans with various filters and pagination by a moderator or administrator. 
 *
 * This test covers the following business scenarios:
 * 1. Data setup: Create multiple member accounts (moderator, regular members) and several ban records with varied attributes (permanent/temp, different members, reasons, expirations).
 * 2. Tests retrieval of ban list with:
 *    a. No filters (should return all with correct pagination)
 *    b. member_id filter (should return only bans for that member)
 *    c. moderator_id filter (should return only bans by that moderator)
 *    d. permanent (true/false) filter (must reflect only permanent or only temporary bans)
 *    e. filter cases which return no rows (nonexistent member_id)
 *    f. Pagination (limit testing)
 * 3. Access: Only moderators (=set up in test) should have access, but there is no separate privilege API; just regular creation.
 *
 * At each step, result type correctness and business rule effect are asserted.
 */
export async function test_api_discussionBoard_test_list_bans_with_various_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Data setup: Create moderator & members
  const moderator = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(moderator);

  const member1 = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member1);

  const member2 = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member2);

  // 2. Create several ban records: permanent and temporary
  const permBan = await api.functional.discussionBoard.bans.post(connection, {
    body: {
      member_id: member1.id,
      moderator_id: moderator.id,
      ban_reason: "Multiple TOS violation",
      permanent: true,
      expires_at: null,
    },
  });
  typia.assert(permBan);

  const tempBan = await api.functional.discussionBoard.bans.post(connection, {
    body: {
      member_id: member2.id,
      moderator_id: moderator.id,
      ban_reason: "Spam",
      permanent: false,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    },
  });
  typia.assert(tempBan);

  // 3a. List bans with no filters: should include both bans
  const allBans = await api.functional.discussionBoard.bans.patch(connection, {
    body: {},
  });
  typia.assert(allBans);
  TestValidator.predicate("no filter: all setup bans are included")(!!allBans.data.find((b) => b.id === permBan.id) && !!allBans.data.find((b) => b.id === tempBan.id));

  // 3b. member_id filter
  const bansByMember1 = await api.functional.discussionBoard.bans.patch(connection, {
    body: { filter: { member_id: member1.id } },
  });
  typia.assert(bansByMember1);
  TestValidator.predicate("bans filtered for member1")(bansByMember1.data.every((b) => b.member_id === member1.id));

  // 3c. moderator_id filter
  const bansByModerator = await api.functional.discussionBoard.bans.patch(connection, {
    body: { filter: { moderator_id: moderator.id } },
  });
  typia.assert(bansByModerator);
  TestValidator.predicate("bans filtered for moderator")(bansByModerator.data.every((b) => b.moderator_id === moderator.id));

  // 3d. permanent true
  const onlyPermanent = await api.functional.discussionBoard.bans.patch(connection, {
    body: { filter: { permanent: true } },
  });
  typia.assert(onlyPermanent);
  TestValidator.predicate("permanent bans only")(onlyPermanent.data.every((b) => b.permanent === true));

  // 3d2. permanent false
  const onlyTemporary = await api.functional.discussionBoard.bans.patch(connection, {
    body: { filter: { permanent: false } },
  });
  typia.assert(onlyTemporary);
  TestValidator.predicate("temporary bans only")(onlyTemporary.data.every((b) => b.permanent === false));

  // 3e. Non-existent member_id (should return no data)
  const bansByNonexistent = await api.functional.discussionBoard.bans.patch(connection, {
    body: { filter: { member_id: typia.random<string & tags.Format<"uuid">>() } },
  });
  typia.assert(bansByNonexistent);
  TestValidator.equals("empty for non-existent member")(bansByNonexistent.data.length)(0);

  // 3f. Pagination test: limit = 1
  const oneBan = await api.functional.discussionBoard.bans.patch(connection, {
    body: { limit: 1 },
  });
  typia.assert(oneBan);
  TestValidator.equals("one record per page")(oneBan.data.length)(1);
  TestValidator.equals("pagination limit meta")(oneBan.pagination.limit)(1);
}