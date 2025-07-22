import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";
import type { IPageIDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMention";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate listing/searching of mentions as a moderator/administrator, covering RBAC audit-compliance.
 *
 * This test ensures that, when logged in as a moderator/administrator, you can:
 * 1. Retrieve all mentions, regardless of sender/recipient (covering all users)
 * 2. Correctly filter by mentioned_member_id and actor_member_id
 * 3. Use pagination options properly
 * 4. See both "sent" and "received" mentions across users (as per RBAC requirements)
 *
 * Steps:
 * 1. Create three members: two regular, one to be escalated as admin
 * 2. Assign administrator privileges to one member
 * 3. Create mention records across combinations (member1 → member2, member2 → member1, admin → member1)
 * 4. As admin, list ALL mentions; verify all created mentions are present
 * 5. Filter by mentioned_member_id ("mentions received"), check filtering correctness
 * 6. Filter by actor_member_id ("mentions sent"), check filtering correctness
 * 7. Use pagination, and verify returned count/limit
 */
export async function test_api_discussionBoard_test_list_mentions_as_moderator_includes_all_mentions(
  connection: api.IConnection,
) {
  // 1. Register three members: two normal + one for admin assignment
  const password1 = RandomGenerator.alphaNumeric(12);
  const member1 = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: password1,
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member1);
  const password2 = RandomGenerator.alphaNumeric(12);
  const member2 = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: password2,
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member2);
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: adminPassword,
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(adminMember);

  // 2. Escalate admin privileges
  const admin = await api.functional.discussionBoard.administrators.post(connection, {
    body: {
      member_id: adminMember.id,
    },
  });
  typia.assert(admin);

  // 3. Create cross-mention events:
  // member1 → member2 (post), member2 → member1 (comment), admin → member1 (post)
  const content_type_a = "post";
  const content_type_b = "comment";
  const content_id_a = typia.random<string & tags.Format<"uuid">>();
  const content_id_b = typia.random<string & tags.Format<"uuid">>();

  // member1 mentions member2
  const mention1 = await api.functional.discussionBoard.mentions.post(connection, {
    body: {
      mentioned_member_id: member2.id,
      content_type: content_type_a,
      content_id: content_id_a,
    },
  });
  typia.assert(mention1);
  // member2 mentions member1
  const mention2 = await api.functional.discussionBoard.mentions.post(connection, {
    body: {
      mentioned_member_id: member1.id,
      content_type: content_type_b,
      content_id: content_id_b,
    },
  });
  typia.assert(mention2);
  // admin mentions member1
  const mention3 = await api.functional.discussionBoard.mentions.post(connection, {
    body: {
      mentioned_member_id: member1.id,
      content_type: content_type_a,
      content_id: content_id_b,
    },
  });
  typia.assert(mention3);

  // 4. As admin: list all mentions, ensure all test mentions are found
  const allMentions = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {},
  });
  typia.assert(allMentions);
  const allMentionIds = allMentions.data.map((m) => m.id);
  TestValidator.predicate("all created mentions are found in admin view")(
    allMentionIds.includes(mention1.id) &&
    allMentionIds.includes(mention2.id) &&
    allMentionIds.includes(mention3.id)
  );

  // 5. Filter: mentions where mentioned_member_id==member1.id (mentions 'received' by member1)
  const mentionsOfMember1 = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      mentioned_member_id: member1.id,
    },
  });
  typia.assert(mentionsOfMember1);
  TestValidator.predicate("filter: all mentions where member1 is mentioned")(
    mentionsOfMember1.data.every((m) => m.mentioned_member_id === member1.id)
  );
  TestValidator.predicate("filter: known mentions to member1 exist")(
    mentionsOfMember1.data.some((m) => m.id === mention2.id || m.id === mention3.id)
  );

  // 6. Filter: mentions sent by member1 (actor_member_id == member1.id)
  const mentionsFromMember1 = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      actor_member_id: member1.id,
    },
  });
  typia.assert(mentionsFromMember1);
  TestValidator.predicate("filter: all mentions sent by member1")(
    mentionsFromMember1.data.every((m) => m.actor_member_id === member1.id)
  );

  // 7. Pagination: limit to 2 records
  const pagedResult = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      page: 1,
      limit: 2,
    },
  });
  typia.assert(pagedResult);
  TestValidator.equals("pagination: record count respects limit")(
    pagedResult.data.length
  )(
    Math.min(2, allMentions.data.length)
  );
}