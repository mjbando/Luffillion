
import {
  getQuestionById,
  parseEntries,
} from "@/lib/daily";

import { TIER_ORDER, type Tier } from "@/data/tiers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const question = getQuestionById(
    url.searchParams.get("q") ?? ""
  );

  if (!question) {
    return Response.json(
      { error: "Invalid question." },
      { status: 400 }
    );
  }

  const tiers = Object.fromEntries(
    TIER_ORDER.map((tier) => [
      tier,
      [] as {
        name: string;
        points: number;
        found: number;
      }[],
    ])
  ) as Record<
    Tier,
    {
      name: string;
      points: number;
      found: number;
    }[]
  >;

  for (const entry of parseEntries(question)) {
    tiers[entry.tier].push({
      name: entry.name,
      points: entry.points,
      found: 0,
    });
  }

  const total = TIER_ORDER.reduce(
    (sum, tier) => sum + tiers[tier].length,
    0
  );

  return Response.json({
    questionId: question.id,
    prompt: question.prompt,
    total,
    totalFound: 0,
    tiers,
  });
}
