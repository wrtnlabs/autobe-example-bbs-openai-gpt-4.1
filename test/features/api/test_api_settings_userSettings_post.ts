import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserSettings";

export async function test_api_settings_userSettings_post(
  connection: api.IConnection,
) {
  const output: IUserSettings = await api.functional.settings.userSettings.post(
    connection,
    {
      body: typia.random<IUserSettings.ICreate>(),
    },
  );
  typia.assert(output);
}
