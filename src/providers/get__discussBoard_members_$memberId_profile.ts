import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardUserProfile";

/**
 * Retrieve public user profile for a given member by memberId
 * (discuss_board_user_profiles table).
 *
 * Fetches and exposes the profile information for a member, drawing data from
 * the discuss_board_user_profiles table by referencing the supplied memberId.
 * Includes fields such as displayName, bio, avatarUri, location, and website,
 * as well as created_at and updated_at timestamps plus soft-deletion metadata.
 * Public visibility is enforced at application logic, while private profiles or
 * suspended/banned accounts are constrained by corresponding status or business
 * rules.
 *
 * This endpoint is accessible to all, including guests, for publicly available
 * profiles. Privacy controls for the member, such as profile visibility
 * preferences, are implemented via business logic. Related endpoints include
 * member public index listing and account detail retrieval.
 *
 * @param props - Object containing the memberId of the target member
 * @param props.memberId - Unique identifier of the target member whose profile
 *   is being retrieved
 * @returns Returns the detailed user profile data for the specified member
 * @throws {Error} When the profile does not exist for the specified memberId
 */
export async function get__discussBoard_members_$memberId_profile(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardUserProfile> {
  const { memberId } = props;
  const profile = await MyGlobal.prisma.discuss_board_user_profiles.findUnique({
    where: { member_id: memberId },
  });
  if (!profile) throw new Error("Profile not found");
  return {
    id: profile.id,
    member_id: profile.member_id,
    display_name: profile.display_name ?? undefined,
    bio: profile.bio ?? undefined,
    avatar_uri: profile.avatar_uri ?? undefined,
    location: profile.location ?? undefined,
    website: profile.website ?? undefined,
    created_at: toISOStringSafe(profile.created_at),
    updated_at: toISOStringSafe(profile.updated_at),
    deleted_at: profile.deleted_at
      ? toISOStringSafe(profile.deleted_at)
      : undefined,
  };
}
