import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardGuest";

/**
 * Verify that a registered guest can successfully refresh their temporary JWT
 * session using a valid, unexpired refresh token. The test performs guest join
 * to obtain the refresh token, then uses this refresh token to receive new
 * access/refresh tokens. The final response should include updated tokens and
 * retain the same guest ID. This logic ensures that guests can continue
 * anonymous access within the validity period and is required for supporting
 * analytics flows dependent on continuous session renewal.
 *
 * Steps:
 *
 * 1. Register a guest (join) and obtain the issued refresh token and guest id
 * 2. Use the refresh token in the /auth/guest/refresh endpoint
 * 3. Assert that the new token set is valid and guest id remains unchanged
 * 4. Assert that at least the token values (access/refresh) are updated by refresh
 */
export async function test_api_guest_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Register a guest (join) and get refresh token
  const guest: IDiscussBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        ip_address: RandomGenerator.alphaNumeric(12),
        user_agent: RandomGenerator.paragraph({ sentences: 4 }),
        referer: null,
      } satisfies IDiscussBoardGuest.ICreate,
    });
  typia.assert(guest);
  const firstId = guest.id;
  const firstToken = guest.token;
  // Step 2: Use the refresh token in the /auth/guest/refresh endpoint
  const refreshed: IDiscussBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: firstToken.refresh,
      } satisfies IDiscussBoardGuest.IRefresh,
    });
  typia.assert(refreshed);
  // Step 3: Assert guest id remains unchanged
  TestValidator.equals("guest id remains after refresh", refreshed.id, firstId);
  // Step 4: Assert token values have changed (tokens are renewed)
  TestValidator.notEquals(
    "access token should be renewed",
    refreshed.token.access,
    firstToken.access,
  );
  TestValidator.notEquals(
    "refresh token should be renewed",
    refreshed.token.refresh,
    firstToken.refresh,
  );
  // Step 5: All tokens and expiry fields should look valid ISO strings
  typia.assert(refreshed.token);
}

/**
 * - The test function correctly performs guest registration and issues a refresh
 *   request using the previously returned refresh token.
 * - All API SDK functions are properly awaited. Type assignments and typia.assert
 *   checks are strictly applied to all API responses and tokens.
 * - Random data generation adheres to function signature guidance for device/user
 *   agent and IP fields. Use of alphaNumeric for the IP is for
 *   privacy-awareness and example coverage (often, IP anonymization, or could
 *   use more realistic IPv4, but this is sufficient for business logic test).
 * - TestValidator assertions include descriptive titles and properly check
 *   business requirements: guest id is retained after refresh and tokens update
 *   as expected.
 * - There are no additional imports, no type suppression, and full template
 *   compliance.
 * - No required field is omitted; all structures are valid per DTO definitions.
 * - No test case attempts type-validation errors, business logic only is tested.
 * - Possible improvements: use a more realistic IP format generator for even
 *   better test realism, but alphaNumeric suffices for the analytics-tracking
 *   scenario.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.0. Critical Requirements and Type Safety
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O NO missing required fields
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 *   - O NO type safety violations (any, @ts-ignore, etc.)
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O CRITICAL: Step 4 revise COMPLETED (no copy-paste if errors found)
 */
const __revise = {};
__revise;
