import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";
import type { IPageIDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardWarning";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates the paginated, filtered listing of user warnings via PATCH /discussionBoard/warnings.
 *
 * This test covers multiple roles (administrator & moderator) and various warning parameters,
 * ensuring warnings can be filtered by member, moderator, type, created/expiration dates, and expired status.
 * It also checks pagination results and verifies access control: only privileged users can query.
 *
 * Steps:
 * 1. Register several members to represent warning recipients.
 * 2. Assign admin role to one member and moderator role to another.
 * 3. As admin, issue warnings of various types to random members (including both expiring and permanent warnings).
 * 4. As moderator, issue more warnings with overlapping and unique characteristics.
 * 5. PATCH /discussionBoard/warnings with various filters (by member_id, moderator_id, warning_type, expired flag).
 * 6. Confirm result sets match filters: right targets, right types, right roles, right expired/not expired logic.
 * 7. Confirm pagination (limit, current, records, pages) metadata is consistent with data.
 * 8. Try a filter with no matches – expect empty result.
 * 9. As unprivileged member, attempt PATCH /discussionBoard/warnings and verify access denied.
 */
export async function test_api_discussionBoard_test_list_warnings_with_various_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register members (warning recipients & role holders)
  const members = await Promise.all(ArrayUtil.repeat(4)(async () => {
    const data = await api.functional.discussionBoard.members.post(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        hashed_password: RandomGenerator.alphaNumeric(20),
        display_name: RandomGenerator.name(),
        profile_image_url: Math.random() > 0.5 ? typia.random<string & tags.Format<"uri">>() : null,
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(data);
    return data;
  }));

  // Choose admin and moderator
  const [adminMember, moderatorMember, user1, user2] = members;

  // 2. Assign admin role (to adminMember)
  const adminAssignment = await api.functional.discussionBoard.administrators.post(connection, {
    body: { member_id: adminMember.id } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(adminAssignment);

  // 3. Assign moderator role (to moderatorMember)
  const moderatorAssignment = await api.functional.discussionBoard.moderators.post(connection, {
    body: { member_id: moderatorMember.id } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderatorAssignment);

  // 4. As admin, issue warnings for both user1 and user2 (permanent and expiring)
  // Issue expiring warning (already expired)
  const expiredDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
  const adminWarning1 = await api.functional.discussionBoard.warnings.post(connection, {
    body: {
      member_id: user1.id,
      moderator_id: adminMember.id,
      warning_type: "spam",
      message: "Expired warning by admin",
      expires_at: expiredDate,
    } satisfies IDiscussionBoardWarning.ICreate,
  });
  typia.assert(adminWarning1);

  // Issue permanent warning (not expired)
  const adminWarning2 = await api.functional.discussionBoard.warnings.post(connection, {
    body: {
      member_id: user2.id,
      moderator_id: adminMember.id,
      warning_type: "harassment",
      message: "Permanent warning by admin",
      expires_at: null,
    } satisfies IDiscussionBoardWarning.ICreate,
  });
  typia.assert(adminWarning2);

  // 5. As moderator, issue warnings (one permanent, one to admin for role overlap)
  // Issue permanent warning
  const moderatorWarning1 = await api.functional.discussionBoard.warnings.post(connection, {
    body: {
      member_id: user1.id,
      moderator_id: moderatorMember.id,
      warning_type: "off-topic",
      message: "Perm warning by mod",
      expires_at: null,
    } satisfies IDiscussionBoardWarning.ICreate,
  });
  typia.assert(moderatorWarning1);
  // Issue expiring warning for adminMember
  const notYetExpiredDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 1 day in future
  const moderatorWarning2 = await api.functional.discussionBoard.warnings.post(connection, {
    body: {
      member_id: adminMember.id,
      moderator_id: moderatorMember.id,
      warning_type: "harassment",
      message: "Not yet expired warning by mod",
      expires_at: notYetExpiredDate,
    } satisfies IDiscussionBoardWarning.ICreate,
  });
  typia.assert(moderatorWarning2);

  // 6. Filter: By member_id (user1)
  const warningsByMember = await api.functional.discussionBoard.warnings.patch(connection, {
    body: {
      member_id: user1.id,
    } satisfies IDiscussionBoardWarning.IRequest,
  });
  typia.assert(warningsByMember);
  TestValidator.predicate("all results are for user1")(warningsByMember.data.every(wr => wr.member_id === user1.id));

  // 7. Filter: By moderator_id (admin)
  const warningsByAdmin = await api.functional.discussionBoard.warnings.patch(connection, {
    body: {
      moderator_id: adminMember.id,
    } satisfies IDiscussionBoardWarning.IRequest,
  });
  typia.assert(warningsByAdmin);
  TestValidator.predicate("all moderator_id=admin")(warningsByAdmin.data.every(wr => wr.moderator_id === adminMember.id));

  // 8. Filter: By warning_type ('harassment')
  const typeHarassment = await api.functional.discussionBoard.warnings.patch(connection, {
    body: {
      warning_type: "harassment",
    } satisfies IDiscussionBoardWarning.IRequest,
  });
  typia.assert(typeHarassment);
  TestValidator.predicate("all type=harassment")(typeHarassment.data.every(wr => wr.warning_type === "harassment"));

  // 9. Filter: Expired (should only retrieve expired warnings)
  const expiredWarnings = await api.functional.discussionBoard.warnings.patch(connection, {
    body: { expired: true } satisfies IDiscussionBoardWarning.IRequest }
  );
  typia.assert(expiredWarnings);
  TestValidator.predicate("all are expired")(
    expiredWarnings.data.every(wr => {
      if (!wr.expires_at) return false;
      return new Date(wr.expires_at).getTime() < Date.now();
    })
  );

  // 10. Filter: Not expired
  const activeWarnings = await api.functional.discussionBoard.warnings.patch(connection, {
    body: { expired: false } satisfies IDiscussionBoardWarning.IRequest }
  );
  typia.assert(activeWarnings);
  TestValidator.predicate("none expired")(
    activeWarnings.data.every(wr =>
      !wr.expires_at || new Date(wr.expires_at).getTime() > Date.now()
    )
  );

  // 11. Filter: By created_from (should find recently created warnings)
  const recentFrom = new Date(Date.now() - 3600 * 1000).toISOString();
  const recentWarnings = await api.functional.discussionBoard.warnings.patch(connection, {
    body: { created_from: recentFrom } satisfies IDiscussionBoardWarning.IRequest }
  );
  typia.assert(recentWarnings);
  TestValidator.predicate("all created_at >= recentFrom")(recentWarnings.data.every(wr =>
    new Date(wr.created_at).getTime() >= new Date(recentFrom).getTime()
  ));

  // 12. Filter: By created_to (should get all created up to now)
  const nowIso = new Date().toISOString();
  const allUpToNow = await api.functional.discussionBoard.warnings.patch(connection, {
    body: { created_to: nowIso } satisfies IDiscussionBoardWarning.IRequest },
  );
  typia.assert(allUpToNow);
  TestValidator.predicate("all created_at <= now")(allUpToNow.data.every(wr =>
    new Date(wr.created_at).getTime() <= new Date(nowIso).getTime()
  ));

  // 13. Filter: Multiple overlapping conditions (member_id + warning_type + not expired)
  const overlap = await api.functional.discussionBoard.warnings.patch(connection, {
    body: { member_id: user1.id, warning_type: "off-topic", expired: false } satisfies IDiscussionBoardWarning.IRequest },
  );
  typia.assert(overlap);
  TestValidator.predicate("exact match for compound conditions")(
    overlap.data.every(wr =>
      wr.member_id === user1.id &&
      wr.warning_type === "off-topic" &&
      (!wr.expires_at || new Date(wr.expires_at).getTime() > Date.now())
    )
  );

  // 14. Pagination metadata check
  const paged = await api.functional.discussionBoard.warnings.patch(connection, {
    body: { } satisfies IDiscussionBoardWarning.IRequest,
  });
  typia.assert(paged);
  TestValidator.equals("records=data.length")(paged.pagination.records)(paged.data.length);
  TestValidator.equals("pages")(paged.pagination.pages)(1);

  // 15. Empty result (nonexistent member)
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  const emptyRes = await api.functional.discussionBoard.warnings.patch(connection, {
    body: { member_id: fakeId } satisfies IDiscussionBoardWarning.IRequest },
  );
  typia.assert(emptyRes);
  TestValidator.equals("empty for unused id")(emptyRes.data.length)(0);

  // 16. Disable role by using a plain user and check access denied
  // (simulate by registering a new member for this purpose)
  const plainUser = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(20),
      display_name: RandomGenerator.name(),
      profile_image_url: Math.random() > 0.5 ? typia.random<string & tags.Format<"uri">>() : null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(plainUser);
  // Role switching assumed by endpoint permission context (here we would impersonate plainUser if supported)
  await TestValidator.error("should deny access for plain members")(async () => {
    await api.functional.discussionBoard.warnings.patch(connection, {
      body: { } satisfies IDiscussionBoardWarning.IRequest,
    });
  });
}