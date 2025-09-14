import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardForbiddenWords } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardForbiddenWords";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update an existing forbidden word rule (discuss_board_forbidden_words table)
 *
 * Updates a forbidden words record by its unique ID, allowing modification of
 * the expression, rationale, or other properties for compliance or moderation
 * policy changes. Strictly restricted to administrative roles.
 *
 * @param props - The operation input parameters
 * @param props.administrator - The authenticated administrator performing the
 *   update
 * @param props.forbiddenWordId - UUID of the forbidden word rule to update
 * @param props.body - Fields to update (expression, description, deleted_at)
 * @returns The updated forbidden word moderation rule with ISO 8601 timestamps
 * @throws {Error} When the forbidden word rule is not found by ID
 */
export async function put__discussBoard_administrator_forbiddenWords_$forbiddenWordId(props: {
  administrator: AdministratorPayload;
  forbiddenWordId: string & tags.Format<"uuid">;
  body: IDiscussBoardForbiddenWords.IUpdate;
}): Promise<IDiscussBoardForbiddenWords> {
  const { administrator, forbiddenWordId, body } = props;

  // Find existing forbidden word by ID; throw on missing
  const existing =
    await MyGlobal.prisma.discuss_board_forbidden_words.findUnique({
      where: { id: forbiddenWordId },
    });
  if (!existing) {
    throw new Error("Forbidden word rule not found");
  }

  // Perform update with provided fields, always updating updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discuss_board_forbidden_words.update({
    where: { id: forbiddenWordId },
    data: {
      expression: body.expression ?? undefined,
      description: body.description ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: now,
    },
  });

  // Return fully-typed object with ISO8601 UTC strings for datetimes
  return {
    id: updated.id,
    expression: updated.expression,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
