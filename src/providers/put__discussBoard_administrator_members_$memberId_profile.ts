import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardUserProfile";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update a user's public profile with new metadata (discuss_board_user_profiles
 * table).
 *
 * This endpoint allows an administrator to update the profile information for a
 * member. The function finds the profile by the specified memberId, applies
 * updates from the body, and returns the updated profile data, ensuring all
 * date and nullable fields follow contract expectations.
 *
 * @param props - Object containing:
 *
 *   - Administrator: Authenticated AdministratorPayload
 *   - MemberId: UUID of the member whose profile will be updated
 *   - Body: Fields to update as provided in IDiscussBoardUserProfile.IUpdate
 *       (display_name, bio, avatar_uri, location, website)
 *
 * @returns The updated IDiscussBoardUserProfile object
 * @throws {Error} If the profile for the memberId does not exist
 */
export async function put__discussBoard_administrator_members_$memberId_profile(props: {
  administrator: AdministratorPayload;
  memberId: string & tags.Format<"uuid">;
  body: IDiscussBoardUserProfile.IUpdate;
}): Promise<IDiscussBoardUserProfile> {
  const { memberId, body } = props;

  const profile = await MyGlobal.prisma.discuss_board_user_profiles.findFirst({
    where: { member_id: memberId },
  });
  if (!profile) throw new Error("Profile not found");

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discuss_board_user_profiles.update({
    where: { member_id: memberId },
    data: {
      display_name: body.display_name ?? undefined,
      bio: body.bio ?? undefined,
      avatar_uri: body.avatar_uri ?? undefined,
      location: body.location ?? undefined,
      website: body.website ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    member_id: updated.member_id,
    display_name: updated.display_name ?? undefined,
    bio: updated.bio ?? undefined,
    avatar_uri: updated.avatar_uri ?? undefined,
    location: updated.location ?? undefined,
    website: updated.website ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at != null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
