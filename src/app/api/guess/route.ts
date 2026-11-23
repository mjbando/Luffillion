import {
  checkGuess,
  getQuestionById,
  suggestGuess,
  todayKey,
} from "@/lib/daily";

export const dynamic = "force-dynamic";

interface GuessBody {
  questionId?: unknown;
  guess?: unknown;
}

export async function POST(request: Request) {
  let body: GuessBody;

  try {
    body = (await request.json()) as GuessBody;
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const questionId =
    typeof body.questionId === "string" ? body.questionId : "";

  const guess =
    typeof body.guess === "string"
      ? body.guess.trim().slice(0, 80)
      : "";

  const question = getQuestionById(questionId);

  if (!question) {
    return Response.json(
      { error: "Invalid question." },
      { status: 400 }
    );
  }

  if (!guess) {
    return Response.json({ correct: false });
  }

  const match = checkGuess(question, guess);

  if (!match) {
    return Response.json({
      correct: false,
      suggestion: suggestGuess(question, guess),
    });
  }

  return Response.json({
    correct: true,
    name: match.name,
    tier: match.tier,
    points: match.points,
    dayKey: todayKey(),
  });
}