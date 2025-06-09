import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrganization";

export async function test_api_core_organizations_putById(
  connection: api.IConnection,
) {
  const output: IOrganization = await api.functional.core.organizations.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IOrganization.IUpdate>(),
    },
  );
  typia.assert(output);
}
