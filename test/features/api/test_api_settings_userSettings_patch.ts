import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIUserSettings";
import { IUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserSettings";

export async function test_api_settings_userSettings_patch(
  connection: api.IConnection,
) {
  const output: IPageIUserSettings =
    await api.functional.settings.userSettings.patch(connection, {
      body: typia.random<IUserSettings.IRequest>(),
    });
  typia.assert(output);
}
