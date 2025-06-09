import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageISiteSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISiteSetting";
import { ISiteSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ISiteSetting";

export async function test_api_settings_siteSettings_patch(
  connection: api.IConnection,
) {
  const output: IPageISiteSetting =
    await api.functional.settings.siteSettings.patch(connection, {
      body: typia.random<ISiteSetting.IRequest>(),
    });
  typia.assert(output);
}
