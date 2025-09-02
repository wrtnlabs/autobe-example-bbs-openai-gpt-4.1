import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";
import type { IPageIDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotificationPreference";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate successful retrieval and filtering of notification preferences
 * for a discussion board user.
 *
 * This test verifies that a user can register successfully, and then
 * utilize the notification preferences listing/filtering endpoint to fetch
 * their notification settings. The test ensures system default or
 * previously-set preferences are present post-registration, and that
 * various filtering criteria applied via the PATCH endpoint produce
 * accurate, logically filtered results.
 *
 * Steps:
 *
 * 1. Register a new user (using the join endpoint).
 * 2. Confirm notification preferences exist for the new user (can rely on
 *    system defaults if no explicit preferences are set).
 * 3. Retrieve all notification preferences without filters, assert result
 *    contains at least one preference with the new user's user_id and
 *    reasonable values.
 * 4. Apply various filters (email_enabled, push_enabled, in_app_enabled,
 *    frequency, categories) one by one via the PATCH endpoint body, and
 *    validate that each result set is correctly filtered according to
 *    request parameters.
 * 5. Assert that all preferences returned belong to the authenticated user (by
 *    user_id), and that the filtering logic matches manual expectation for
 *    the request.
 * 6. Ensure system does not leak other users' notification preferences, and
 *    pagination works as expected.
 * 7. Test negative filter scenario to assert no results returned when a filter
 *    does not match existing preferences.
 */
export async function test_api_notification_preferences_list_success(
  connection: api.IConnection,
) {
  // 1. Register new user
  const userInput: IDiscussionBoardUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12) + "A!1",
    display_name: RandomGenerator.name(2),
    consent: true,
  };
  const joinResp: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userInput });
  typia.assert(joinResp);
  const userId = joinResp.user.id;

  // 2. Retrieve all notification preferences for the user (no filter)
  const allPrefsResp =
    await api.functional.discussionBoard.user.notificationPreferences.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(allPrefsResp);
  TestValidator.predicate(
    "retrieved at least one notification preference for the new user",
    allPrefsResp.data.length > 0,
  );
  allPrefsResp.data.forEach((pref) => {
    TestValidator.equals(
      "all notification preferences belong to new user after registration",
      pref.user_id,
      userId,
    );
  });

  // 3. Filter by email_enabled=true
  const emailEnabledPrefs = allPrefsResp.data.filter(
    (p) => p.email_enabled === true,
  );
  if (emailEnabledPrefs.length > 0) {
    const filteredByEmailResp =
      await api.functional.discussionBoard.user.notificationPreferences.index(
        connection,
        {
          body: { email_enabled: true },
        },
      );
    typia.assert(filteredByEmailResp);
    TestValidator.predicate(
      "filter by email_enabled=true returns only enabled preferences for new user",
      filteredByEmailResp.data.every(
        (p) => p.email_enabled === true && p.user_id === userId,
      ),
    );
  }
  // 4. Filter by push_enabled=true
  const pushEnabledPrefs = allPrefsResp.data.filter(
    (p) => p.push_enabled === true,
  );
  if (pushEnabledPrefs.length > 0) {
    const filteredByPushResp =
      await api.functional.discussionBoard.user.notificationPreferences.index(
        connection,
        {
          body: { push_enabled: true },
        },
      );
    typia.assert(filteredByPushResp);
    TestValidator.predicate(
      "filter by push_enabled=true returns only enabled preferences for new user",
      filteredByPushResp.data.every(
        (p) => p.push_enabled === true && p.user_id === userId,
      ),
    );
  }
  // 5. Filter by in_app_enabled=true
  const inAppEnabledPrefs = allPrefsResp.data.filter(
    (p) => p.in_app_enabled === true,
  );
  if (inAppEnabledPrefs.length > 0) {
    const filteredByInAppResp =
      await api.functional.discussionBoard.user.notificationPreferences.index(
        connection,
        {
          body: { in_app_enabled: true },
        },
      );
    typia.assert(filteredByInAppResp);
    TestValidator.predicate(
      "filter by in_app_enabled=true returns only enabled preferences for new user",
      filteredByInAppResp.data.every(
        (p) => p.in_app_enabled === true && p.user_id === userId,
      ),
    );
  }
  // 6. Filter by frequency for the first preference present, if any
  if (allPrefsResp.data.length > 0) {
    const frequencyValue = allPrefsResp.data[0].frequency;
    const filterByFreqResp =
      await api.functional.discussionBoard.user.notificationPreferences.index(
        connection,
        {
          body: { frequency: frequencyValue },
        },
      );
    typia.assert(filterByFreqResp);
    filterByFreqResp.data.forEach((p) => {
      TestValidator.equals(
        "preference filtered by frequency value for current user",
        p.frequency,
        frequencyValue,
      );
      TestValidator.equals(
        "preference by frequency belongs to user",
        p.user_id,
        userId,
      );
    });
  }
  // 7. Filter by categories for the first preference present, if any
  if (allPrefsResp.data.length > 0) {
    const categoriesValue = allPrefsResp.data[0].categories;
    const filterByCatResp =
      await api.functional.discussionBoard.user.notificationPreferences.index(
        connection,
        {
          body: { categories: categoriesValue },
        },
      );
    typia.assert(filterByCatResp);
    filterByCatResp.data.forEach((p) => {
      TestValidator.equals(
        "preference filtered by categories value for current user",
        p.categories,
        categoriesValue,
      );
      TestValidator.equals(
        "preference by category belongs to user",
        p.user_id,
        userId,
      );
    });
  }
  // 8. Test pagination by requesting 1 record per page if more than 1 exists
  if (allPrefsResp.data.length > 1) {
    const pageResp =
      await api.functional.discussionBoard.user.notificationPreferences.index(
        connection,
        {
          body: { page: 1, limit: 1 },
        },
      );
    typia.assert(pageResp);
    TestValidator.equals(
      "pagination returns only one record on limit=1",
      pageResp.data.length,
      1,
    );
    pageResp.data.forEach((p) => {
      TestValidator.equals(
        "preference in paged result belongs to current user",
        p.user_id,
        userId,
      );
    });
  }
  // 9. Negative filter scenario: use frequency that is not present (expect empty result)
  const impossibleFrequency = "never-will-match-this-freq";
  const negativeFilterResp =
    await api.functional.discussionBoard.user.notificationPreferences.index(
      connection,
      {
        body: { frequency: impossibleFrequency },
      },
    );
  typia.assert(negativeFilterResp);
  TestValidator.equals(
    "negative filter (impossible frequency) returns zero results",
    negativeFilterResp.data.length,
    0,
  );
}
