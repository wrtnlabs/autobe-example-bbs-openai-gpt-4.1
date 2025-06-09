import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrganization";

export async function test_api_core_organizations_post(
  connection: api.IConnection,
) {
  const output: IOrganization = await api.functional.core.organizations.post(
    connection,
    {
      body: typia.random<IOrganization.ICreate>(),
    },
  );
  typia.assert(output);
}
