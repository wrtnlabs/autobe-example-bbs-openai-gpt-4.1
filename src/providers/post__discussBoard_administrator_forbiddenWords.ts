import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardForbiddenWords } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardForbiddenWords";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Create a new forbidden word moderation rule (discuss_board_forbidden_words
 * table)
 *
 * This operation creates a new forbidden word, phrase, or regex pattern to be
 * enforced by the discussBoard platform. Only administrators are permitted to
 * perform this action. The expression must be unique; if a forbidden word with
 * the same expression already exists, an error is thrown. On success, returns
 * the created forbidden word moderation rule with all mandatory and optional
 * fields as defined in the schema.
 *
 * @param props - Request properties
 * @param props.administrator - The authenticated administrator initiating this
 *   operation
 * @param props.body - Data describing the new forbidden word to add (expression
 *   and optional description)
 * @returns The created forbidden word moderation rule
 * @throws {Error} If the forbidden word expression already exists (uniqueness
 *   violation)
 */
export async function post__discussBoard_administrator_forbiddenWords(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardForbiddenWords.ICreate;
}): Promise<IDiscussBoardForbiddenWords> {
  const { body } = props;
  // Uniqueness check (expression is unique per schema; case-sensitive per default)
  const exists = await MyGlobal.prisma.discuss_board_forbidden_words.findFirst({
    where: {
      expression: body.expression,
    },
  });
  if (exists) {
    throw new Error("Forbidden word with this expression already exists");
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discuss_board_forbidden_words.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      expression: body.expression,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    expression: created.expression,
    description: created.description ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
