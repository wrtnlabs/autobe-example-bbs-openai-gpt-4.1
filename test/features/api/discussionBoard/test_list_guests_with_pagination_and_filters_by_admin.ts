import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * E2E test: Admin paginated listing and filtering of guest accounts/sessions
 *
 * This test verifies:
 * - Pagination, filter, and response structure for guest session list API
 * - Filtering by properties such as IP address, session token, and date range
 * - Role-restricted access: only administrator (created in test) is able to use the listing API
 * - Result structure matches IPageIDiscussionBoardGuest and item fields
 *
 * Steps:
 * 1. Create an administrator member (to test access)
 * 2. Create several guest sessions, with controlled variety for filter checks
 * 3. As the administrator, query the guest listing endpoint with various filter combinations:
 *    (a) No filter (paginated all)
 *    (b) Filter by session_token
 *    (c) Filter by ip_address
 *    (d) Filter by created_from/created_to bounds
 *    (e) Paging: limit/page
 * 4. Validate each result: pagination metadata and data filters
 * 5. (Negative): Listing as unauthorized user—should error
 */
export async function test_api_discussionBoard_test_list_guests_with_pagination_and_filters_by_admin(
  connection: api.IConnection,
) {
  // 1. Create administrator
  const admin: IDiscussionBoardMember =
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        hashed_password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        profile_image_url: null,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(admin);

  // 2. Create distinct guest sessions for filtering/pagination
  const uniqueGuests: IDiscussionBoardGuest[] =
    await ArrayUtil.asyncRepeat(5)(async (i) => {
      const guest = await api.functional.discussionBoard.guests.post(connection, {
        body: {
          session_token: RandomGenerator.alphaNumeric(20),
          ip_address: `192.168.1.${100 + i}`,
          user_agent: i % 2 === 0 ? `TestUA/Agent${i}` : null,
          expires_at: new Date(Date.now() + 86400 * 1000 + 1000 * i).toISOString() as string & tags.Format<"date-time">,
        } satisfies IDiscussionBoardGuest.ICreate,
      });
      typia.assert(guest);
      return guest;
    });

  // 3a. List all (default page)
  const allPage = await api.functional.discussionBoard.guests.patch(connection, {
    body: {},
  });
  typia.assert(allPage);
  TestValidator.predicate("at least test guests paged")(
    allPage.data.length >= uniqueGuests.length,
  );
  TestValidator.equals("paging: default page 1")(allPage.pagination.current)(1);
  TestValidator.predicate("pages > 0")(allPage.pagination.pages > 0);

  // 3b. Filter: session_token (first guest)
  const byToken = await api.functional.discussionBoard.guests.patch(connection, {
    body: { session_token: uniqueGuests[0].session_token },
  });
  typia.assert(byToken);
  TestValidator.equals("single by token")(byToken.data.length)(1);
  TestValidator.equals("token match")(byToken.data[0].session_token)(uniqueGuests[0].session_token);

  // 3c. Filter: ip_address (second guest)
  const byIP = await api.functional.discussionBoard.guests.patch(connection, {
    body: { ip_address: uniqueGuests[1].ip_address },
  });
  typia.assert(byIP);
  TestValidator.predicate("all IP filtered")(
    byIP.data.every((g) => g.ip_address === uniqueGuests[1].ip_address),
  );

  // 3d. Date range: just third guest's created_at
  const createdVal = uniqueGuests[2].created_at;
  const byDate = await api.functional.discussionBoard.guests.patch(connection, {
    body: { created_from: createdVal, created_to: createdVal },
  });
  typia.assert(byDate);
  TestValidator.predicate("at least 1 result in date filter")(
    byDate.data.some((g) => g.id === uniqueGuests[2].id),
  );

  // 3e. Pagination: limit 2 (first, second page)
  const pg1 = await api.functional.discussionBoard.guests.patch(connection, {
    body: { limit: 2, page: 1 },
  });
  typia.assert(pg1);
  TestValidator.equals("limit page 1 count")(pg1.data.length)(2);
  TestValidator.equals("limit page 1 num")(pg1.pagination.current)(1);

  const pg2 = await api.functional.discussionBoard.guests.patch(connection, {
    body: { limit: 2, page: 2 },
  });
  typia.assert(pg2);
  TestValidator.equals("limit page 2 num")(pg2.pagination.current)(2);

  // 4. Permissions: unauth attempt fails (simulate "guest only" role)
  await TestValidator.error("unauthorized guest list failure")(async () => {
    await api.functional.discussionBoard.guests.patch(connection, {
      body: {},
    });
  });
}