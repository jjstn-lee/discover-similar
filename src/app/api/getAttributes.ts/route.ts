import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { searchSeedsResult} from "@/types/interfaces";


const RECCO_API_BASE = "https://api.reccobeats.com/v1/track/:id/audio-features"

// export async function getTrackAttributes(trackIds: string[]): Promise<ResultTuple> {

// }