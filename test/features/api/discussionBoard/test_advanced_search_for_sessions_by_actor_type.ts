import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import type { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced filtering and pagination when searching user/guest sessions
 * as an admin.
 *
 * Simulates an admin using the advanced search API with various filters and
 * pagination:
 *
 * 1. Create a guest session for 'actor_type' guest.
 * 2. Create two user sessions: one for 'actor_type' admin and one for 'actor_type'
 *    member.
 * 3. As an admin, use the advanced session search API to:
 *
 *    - Retrieve only 'guest' sessions: results must have actor_type 'guest' only, or
 *         be empty if none exist.
 *    - Retrieve only 'admin' sessions: results must have only admin sessions.
 *    - Retrieve only 'member' sessions: results must have only member sessions.
 *    - Retrieve admin sessions with pagination limit to verify paging info/control.
 *    - Search by session_token and expect the correct session to be returned or
 *         empty list if not found.
 * 4. For each search:
 *
 *    - All returned sessions must match the actor_type and filter logic.
 *    - The search respects the given paging/limit controls.
 *    - Empty or null results match appropriate edge expectations.
 * 5. Edge: Search for a non-existent actor_type ('moderator') -> result should be
 *    empty.
 *
 *    - Also search by an invalid session_token -> result should be empty.
 */
export async function test_api_discussionBoard_test_advanced_search_for_sessions_by_actor_type(
  connection: api.IConnection,
) {
  // Step 1: Create a guest session
  const guestSessionIdentifier = typia.random<string>();
  const now = new Date().toISOString();
  const guest = await api.functional.discussionBoard.guests.create(connection, {
    body: {
      session_identifier: guestSessionIdentifier,
      first_seen_at: now,
      last_seen_at: now,
    },
  });
  typia.assert(guest);

  // Step 2: Create user sessions for admin and member
  const adminActorIdentifier = typia.random<string>();
  const adminSessionToken = typia.random<string>();
  const adminSession = await api.functional.discussionBoard.userSessions.create(
    connection,
    {
      body: {
        actor_type: "admin",
        actor_identifier: adminActorIdentifier,
        session_token: adminSessionToken,
        created_at: now,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(adminSession);

  const memberActorIdentifier = typia.random<string>();
  const memberSessionToken = typia.random<string>();
  const memberSession =
    await api.functional.discussionBoard.userSessions.create(connection, {
      body: {
        actor_type: "member",
        actor_identifier: memberActorIdentifier,
        session_token: memberSessionToken,
        created_at: now,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    });
  typia.assert(memberSession);

  // Step 3: Advanced search verification

  // 3a: Filter for 'guest' sessions only
  const guestSearch =
    await api.functional.discussionBoard.admin.userSessions.search(connection, {
      body: { actor_type: "guest" },
    });
  typia.assert(guestSearch);
  TestValidator.predicate("All results are guests")(
    guestSearch.data.every((s) => s.actor_type === "guest"),
  );

  // 3b: Filter for 'admin' sessions only
  const adminSearch =
    await api.functional.discussionBoard.admin.userSessions.search(connection, {
      body: { actor_type: "admin" },
    });
  typia.assert(adminSearch);
  TestValidator.predicate("All results are admins")(
    adminSearch.data.every((s) => s.actor_type === "admin"),
  );

  // 3c: Filter for 'member' sessions only
  const memberSearch =
    await api.functional.discussionBoard.admin.userSessions.search(connection, {
      body: { actor_type: "member" },
    });
  typia.assert(memberSearch);
  TestValidator.predicate("All results are members")(
    memberSearch.data.every((s) => s.actor_type === "member"),
  );

  // 3d: Pagination/limit test - get only 1 admin session
  const paginated =
    await api.functional.discussionBoard.admin.userSessions.search(connection, {
      body: { actor_type: "admin", limit: 1 },
    });
  typia.assert(paginated);
  TestValidator.equals("pagination limit applies")(paginated.data.length)(1);
  TestValidator.equals("pagination info matches")(paginated.pagination.limit)(
    1,
  );

  // 3e: Filter by session_token for admin
  const byToken =
    await api.functional.discussionBoard.admin.userSessions.search(connection, {
      body: { session_token: adminSessionToken },
    });
  typia.assert(byToken);
  TestValidator.equals("token match")(
    byToken.data.length > 0 ? byToken.data[0].session_token : null,
  )(adminSessionToken);

  // Step 4a: Edge - search for moderator sessions (should be none)
  const moderatorSearch =
    await api.functional.discussionBoard.admin.userSessions.search(connection, {
      body: { actor_type: "moderator" },
    });
  typia.assert(moderatorSearch);
  TestValidator.equals("no moderator sessions")(moderatorSearch.data.length)(0);

  // Step 4b: Edge - search for an invalid session_token (should be empty)
  const byInvalidToken =
    await api.functional.discussionBoard.admin.userSessions.search(connection, {
      body: { session_token: "NON_EXISTENT_TOKEN" },
    });
  typia.assert(byInvalidToken);
  TestValidator.equals("no session matches invalid token")(
    byInvalidToken.data.length,
  )(0);
}
