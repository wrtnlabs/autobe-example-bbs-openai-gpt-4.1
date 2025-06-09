import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIUserProfile";
import { IUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserProfile";

export async function test_api_core_userProfiles_patch(
  connection: api.IConnection,
) {
  const output: IPageIUserProfile =
    await api.functional.core.userProfiles.patch(connection, {
      body: typia.random<IUserProfile.IRequest>(),
    });
  typia.assert(output);
}
