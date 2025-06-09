import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserSettings";

export async function test_api_settings_userSettings_getById(
  connection: api.IConnection,
) {
  const output: IUserSettings =
    await api.functional.settings.userSettings.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
