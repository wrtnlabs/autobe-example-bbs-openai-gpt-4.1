import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserProfile";

export async function test_api_core_userProfiles_putById(
  connection: api.IConnection,
) {
  const output: IUserProfile = await api.functional.core.userProfiles.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IUserProfile.IUpdate>(),
    },
  );
  typia.assert(output);
}
