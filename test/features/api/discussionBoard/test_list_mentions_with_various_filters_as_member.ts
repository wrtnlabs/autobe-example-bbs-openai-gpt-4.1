import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";
import type { IPageIDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMention";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test comprehensive mention list filtering and member RBAC for mentions.
 *
 * Steps:
 * 1. Register two members: actor (who creates a mention) and target (who is mentioned).
 * 2. Actor creates at least one mention targeting the target user (content_type/content_id random).
 * 3. Test mention listing as the target:
 *    a. List mentions received by self:
 *       - Without filters (should see mention(s) received)
 *       - By exact content_type/content_id (should narrow results)
 *       - By date window covering and not covering mention(s)
 *       - By pagination: limit 1, page 1 (should see at least one result), high page (should see empty)
 *       - By sent/actor_member_id=actor: should be empty since target didn't send any
 *    b. List mentions sent by self (should be empty, as target didn't send any)
 * 4. Test mention listing as the actor (who sent mention):
 *    a. List sent mentions (actor_member_id=self) should see what actor sent
 *    b. List received mentions (mentioned_member_id=self) should be empty
 *    c. Test with filters, date windows, pagination as above
 * 5. RBAC test: try to query another member's mentions by filtering for their actor_member_id or mentioned_member_id (while not logged in as them) -- should be 403 forbidden.
 *
 * Each query checks returned IDs, pagination fields, empty results when filters don't match, and error conditions.
 */
export async function test_api_discussionBoard_test_list_mentions_with_various_filters_as_member(connection: api.IConnection) {
  // 1. Register two discussion board members
  const actorEmail = typia.random<string & tags.Format<"email">>();
  const actorUsername = RandomGenerator.alphaNumeric(8);
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetUsername = RandomGenerator.alphaNumeric(8);
  const actor = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: actorUsername,
      email: actorEmail,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(actor);
  const target = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: targetUsername,
      email: targetEmail,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(target);

  // 2. The actor creates a mention targeting the target
  const contentType = RandomGenerator.pick(["post", "comment", "thread"]);
  const contentId = typia.random<string & tags.Format<"uuid">>();
  const mention = await api.functional.discussionBoard.mentions.post(connection, {
    body: {
      mentioned_member_id: target.id,
      content_type: contentType,
      content_id: contentId,
    } satisfies IDiscussionBoardMention.ICreate,
  });
  typia.assert(mention);

  // 3. Test listing as target (received by self)
  // Simulate auth: assume connection is authorized as 'target'

  // a. Received: no filters (should see mention(s))
  let res = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      mentioned_member_id: target.id,
    },
  });
  typia.assert(res);
  TestValidator.predicate("target receives at least 1 mention")(res.data.some(m => m.id === mention.id));

  // b. Filter by content_type/content_id (should see the mention)
  res = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      mentioned_member_id: target.id,
      content_type: contentType,
      content_id: contentId,
    },
  });
  typia.assert(res);
  TestValidator.equals("filter exact mention")(res.data.length)(1);
  TestValidator.equals("correct mention ID")(res.data[0].id)(mention.id);

  // c. Date windows
  const createdDate = mention.created_at;
  const beforeDate = new Date(Date.parse(createdDate) - 1000).toISOString();
  const afterDate = new Date(Date.parse(createdDate) + 1000).toISOString();
  // From after mention: should be empty
  res = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      mentioned_member_id: target.id,
      created_from: afterDate,
    },
  });
  typia.assert(res);
  TestValidator.equals("no mention after mention")(res.data.length)(0);
  // To before mention: should be empty
  res = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      mentioned_member_id: target.id,
      created_to: beforeDate,
    },
  });
  typia.assert(res);
  TestValidator.equals("no mention before mention")(res.data.length)(0);
  // From before, to after: should see the mention
  res = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      mentioned_member_id: target.id,
      created_from: beforeDate,
      created_to: afterDate,
    },
  });
  typia.assert(res);
  TestValidator.predicate("between window includes mention")(res.data.some(m => m.id === mention.id));

  // d. Pagination: limit 1, page 1 (should get 1 but not fail)
  res = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      mentioned_member_id: target.id,
      limit: 1,
      page: 1,
    },
  });
  typia.assert(res);
  TestValidator.equals("pagination limit 1")(res.data.length)(1);

  // e. Pagination: large page for empty
  res = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      mentioned_member_id: target.id,
      limit: 1,
      page: 1000,
    },
  });
  typia.assert(res);
  TestValidator.equals("pagination high page is empty")(res.data.length)(0);

  // f. Actor_member_id=actor (received by target, but sent by actor: should not show, since receiver is not actor)
  res = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      mentioned_member_id: target.id,
      actor_member_id: actor.id,
    },
  });
  typia.assert(res);
  // Should still see the mention, since the actor did send it to target
  TestValidator.equals("mention by both fields")(res.data.length)(1);
  TestValidator.equals("correct mention ID")(res.data[0].id)(mention.id);

  // g. Query as target for sent mentions (actor_member_id: target.id, should be empty)
  res = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      actor_member_id: target.id,
    },
  });
  typia.assert(res);
  TestValidator.equals("target sent no mentions")(res.data.length)(0);

  // 4. Repeat as actor (sent by self, should see sent one; received none)
  // Simulate actor as self
  // Sent by self:
  res = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      actor_member_id: actor.id,
    },
  });
  typia.assert(res);
  TestValidator.equals("actor sent 1 mention")(res.data.length)(1);
  TestValidator.equals("sent mention ID")(res.data[0].id)(mention.id);

  // b. Received as actor (should be empty)
  res = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      mentioned_member_id: actor.id,
    },
  });
  typia.assert(res);
  TestValidator.equals("actor received no mentions")(res.data.length)(0);

  // c. Pagination and content_type/content_id
  res = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      actor_member_id: actor.id,
      limit: 1,
      page: 1,
    },
  });
  typia.assert(res);
  TestValidator.equals("actor pagination one sent")(res.data.length)(1);
  TestValidator.equals("actor sent mention ID paged")(res.data[0].id)(mention.id);

  // d. Pagination large page
  res = await api.functional.discussionBoard.mentions.patch(connection, {
    body: {
      actor_member_id: actor.id,
      limit: 1,
      page: 1000,
    },
  });
  typia.assert(res);
  TestValidator.equals("actor high page sent empty")(res.data.length)(0);

  // 5. RBAC: Try to see mentions for another user while not logged in as them (forbidden)
  // Simulate NOT logged as target -- try to see target's mentions while logged as actor; should be forbidden.
  // (Assumes backend enforces RBAC based on login)
  await TestValidator.error("actor cannot see target's received mentions")(
    async () => {
      await api.functional.discussionBoard.mentions.patch(connection, {
        body: {
          mentioned_member_id: target.id,
        },
      });
    },
  );

  // Likewise for another actor's sent mentions while logged as target
  await TestValidator.error("target cannot see actor's sent mentions")(
    async () => {
      await api.functional.discussionBoard.mentions.patch(connection, {
        body: {
          actor_member_id: actor.id,
        },
      });
    },
  );
}