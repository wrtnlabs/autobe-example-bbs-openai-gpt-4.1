import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserSettings";

export async function test_api_settings_userSettings_putById(
  connection: api.IConnection,
) {
  const output: IUserSettings =
    await api.functional.settings.userSettings.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IUserSettings.IUpdate>(),
    });
  typia.assert(output);
}
