import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOrganization";
import { IOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrganization";

export async function test_api_core_organizations_patch(
  connection: api.IConnection,
) {
  const output: IPageIOrganization =
    await api.functional.core.organizations.patch(connection, {
      body: typia.random<IOrganization.IRequest>(),
    });
  typia.assert(output);
}
