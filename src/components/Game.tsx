"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { SAGAS, sagaAt, travelFor } from "@/data/arcs";
import {
  DAILY_QUESTION_COUNT,
  MAX_POINTS,
  QUESTION_SECONDS,
  TIER_CONFIG,
  TIER_LABELS,
  TIER_ORDER,
  type Tier,
} from "@/data/tiers";
import PixelWorld, { type RunSignal, type WorldStatus } from "./PixelWorld";
import Effects from "./Effects";

interface DailyQuestion {
  index: number;
  id: string;
  prompt: string;
  hint: string;
  counts: Record<Tier, number>;
}

interface DailyResponse {
  day: string; // run id (each run has its own questions)
  questions: DailyQuestion[];
  seconds: number;
  maxPoints: number;
  serverNow: number;
}

interface QState {
  started?: number;
  status?: "solved" | "expired";
  tier?: Tier;
  points?: number;
  answer?: string;
  attempts: number;
  wrong: string[];
}

interface RunRecord {
  questionIndex: number;
  tier: Tier;
  points: number;
  arc: string;
}

interface Progress {
  day: string; // run id
  ids?: string[]; // the run's question ids
  q: Record<number, QState>;
  runs: RunRecord[];
}

interface RevealItem {
  name: string;
  points: number;
  found: number;
}

interface Reveal {
  total: number;
  totalFound: number;
  tiers: Record<Tier, RevealItem[]>;
}

const EMPTY_Q: QState = { attempts: 0, wrong: [] };
const LIMIT_MS = QUESTION_SECONDS * 1000;
const RUN_KEY = "luffillion:daily";

function firstOpen(p: Progress): number {
  for (let i = 0; i < DAILY_QUESTION_COUNT; i++) {
    if (!p.q[i]?.status) return i;
  }
  return DAILY_QUESTION_COUNT;
}

export default function Game() {
  const [daily, setDaily] = useState<DailyResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [reveals, setReveals] = useState<Record<number, Reveal>>({});
  const [now, setNow] = useState(0);
  const [guess, setGuess] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<{ q: number; name: string; typed: string } | null>(null);
  const [fx, setFx] = useState<{ id: number; tier: Tier } | null>(null);
  const [runSignal, setRunSignal] = useState<RunSignal | null>(null);
  const [initialPos, setInitialPos] = useState(0);
  const [sagaBanner, setSagaBanner] = useState<{ id: number; saga: number } | null>(null);
  const lastSaga = useRef<number | null>(null);
  const [nopeOn, setNopeOn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [world, setWorld] = useState<WorldStatus>({ pct: 0, arc: "East Blue", saga: 0, running: false });
  const [logOpen, setLogOpen] = useState(false);
  const [nextRunAt, setNextRunAt] = useState(0);
  const [showCountdown, setShowCountdown] = useState(true);
  const revealLoading = useRef(new Set<number>());
  const nopeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load today's run (one run per day; everyone gets the same 7 questions).
  const loadRun = useCallback(() => {
    return fetch("/api/daily", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: DailyResponse & { runId: string; nextRunInMs: number }) => {
        let p: Progress = { day: d.day, ids: d.questions.map((q) => q.id), q: {}, runs: [] };
        try {
          const raw = localStorage.getItem(`${RUN_KEY}:${d.day}`);
          if (raw) {
            const parsed = JSON.parse(raw) as Progress;
            if (parsed.day === d.day) p = parsed;
          }
        } catch {
          // ignore corrupt storage
        }
        revealLoading.current.clear();
        setReveals({});
        setGuess("");
        setMessage(null);
        setSuggestion(null);
        setRunSignal(null);
        setFx(null);
        setSagaBanner(null);
        lastSaga.current = null;
        finishedLive.current = false;
        setNextRunAt(Date.now() + d.nextRunInMs);
        setShowCountdown(firstOpen(p) >= DAILY_QUESTION_COUNT);
        setDaily(d);
        setProgress(p);
        setViewIndex(firstOpen(p));
        setInitialPos(p.runs.reduce((sum, r) => sum + travelFor(r.points), 0));
        setNow(Date.now());
      });
  }, []);

  useEffect(() => {
    loadRun().catch(() => setLoadError("Could not load today's run. Please refresh."));
  }, [loadRun]);

  // Finishing live: let the finale run + effects play, then show the countdown.
  const finishedLive = useRef(false);
  useEffect(() => {
    if (!progress || firstOpen(progress) < DAILY_QUESTION_COUNT || showCountdown || finishedLive.current) return;
    finishedLive.current = true;
    const id = setTimeout(() => setShowCountdown(true), 5000);
    return () => clearTimeout(id);
  }, [progress, showCountdown]);

  // When the countdown reaches zero, the next day's run loads automatically.
  useEffect(() => {
    if (nextRunAt && now >= nextRunAt) {
      setNextRunAt(0);
      loadRun().catch(() => setMessage("Could not load the new run. Please refresh."));
    }
  }, [now, nextRunAt, loadRun]);

  // Persist progress on every change.
  useEffect(() => {
    if (progress) localStorage.setItem(`${RUN_KEY}:${progress.day}`, JSON.stringify(progress));
  }, [progress]);

  // Clock tick for the countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const activeIndex = progress ? firstOpen(progress) : 0;
  const allDone = progress ? activeIndex >= DAILY_QUESTION_COUNT : false;

  // Start the 25s clock the first time the active question is shown.
  useEffect(() => {
    if (!progress || activeIndex >= DAILY_QUESTION_COUNT) return;
    if (viewIndex !== activeIndex || progress.q[activeIndex]?.started) return;
    setProgress((p) =>
      p
        ? {
            ...p,
            q: { ...p.q, [activeIndex]: { ...(p.q[activeIndex] ?? EMPTY_Q), started: Date.now() } },
          }
        : p,
    );
  }, [progress, viewIndex, activeIndex]);

  // Time out the active question.
  useEffect(() => {
    if (!progress || activeIndex >= DAILY_QUESTION_COUNT) return;
    const st = progress.q[activeIndex];
    if (st?.started && !st.status && now - st.started >= LIMIT_MS) {
      setProgress((p) =>
        p
          ? {
              ...p,
              q: { ...p.q, [activeIndex]: { ...(p.q[activeIndex] ?? EMPTY_Q), status: "expired", points: 0 } },
            }
          : p,
      );
      // Last question timed out: still give Luffy his closing victory run.
      if (activeIndex === DAILY_QUESTION_COUNT - 1) {
        const pos = progress.runs.reduce((sum, r) => sum + travelFor(r.points), 0);
        setRunSignal({ id: Date.now(), to: pos, ms: 2600, tier: null, final: true });
      }
    }
  }, [now, progress, activeIndex]);

  // Answer lists stay hidden until all 7 questions are over, then load for the recap.
  useEffect(() => {
    if (!progress || !daily) return;
    if (firstOpen(progress) < DAILY_QUESTION_COUNT) return;
    for (let i = 0; i < DAILY_QUESTION_COUNT; i++) {
      if (progress.q[i]?.status && !reveals[i] && !revealLoading.current.has(i)) {
        revealLoading.current.add(i);
        fetch(`/api/reveal?q=${encodeURIComponent(daily.questions[i].id)}`)
          .then((r) => r.json())
          .then((data: Reveal & { error?: string }) => {
            if (!data.error) setReveals((prev) => ({ ...prev, [i]: data }));
          })
          .finally(() => revealLoading.current.delete(i));
      }
    }
  }, [progress, daily, reveals]);

  const question = daily?.questions[viewIndex];
  const qs: QState = progress?.q[viewIndex] ?? EMPTY_Q;
  const isActive = viewIndex === activeIndex && !allDone;
  const remainingMs = qs.started && !qs.status ? Math.max(0, LIMIT_MS - (now - qs.started)) : LIMIT_MS;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const totalScore = progress
    ? Object.values(progress.q).reduce((sum, q) => sum + (q?.status === "solved" ? q.points ?? 0 : 0), 0)
    : 0;
  const journeyPos = progress ? progress.runs.reduce((sum, r) => sum + travelFor(r.points), 0) : 0;

  function handleWorld(status: WorldStatus) {
    setWorld(status);
    if (lastSaga.current === null) {
      lastSaga.current = status.saga;
      return;
    }
    if (status.saga !== lastSaga.current) {
      lastSaga.current = status.saga;
      if (status.saga > 0) setSagaBanner({ id: Date.now(), saga: status.saga });
    }
  }

  function triggerNope() {
    setNopeOn(true);
    if (nopeTimer.current) clearTimeout(nopeTimer.current);
    nopeTimer.current = setTimeout(() => setNopeOn(false), 450);
  }

  function submitGuess(e: FormEvent) {
    e.preventDefault();
    void sendGuess(guess.trim());
  }

  function acceptSuggestion() {
    if (!suggestion || suggestion.q !== viewIndex) return;
    void sendGuess(suggestion.name);
  }

  async function sendGuess(text: string) {
    if (!daily || !progress || busy || !isActive) return;
    if (!text || !qs.started || qs.status) return;
    if (Date.now() - qs.started >= LIMIT_MS) return;

    setBusy(true);
    setMessage(null);
    setSuggestion(null);
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: daily.questions[viewIndex].id, guess: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Something went wrong.");
        return;
      }

      if (data.correct) {
        const tier = data.tier as Tier;
        const points = data.points as number;
        const newTotal = journeyPos + travelFor(points);
        const arc = sagaAt(newTotal).name;
        const stamp = Date.now();
        setProgress((p) =>
          p
            ? {
                ...p,
                q: {
                  ...p.q,
                  [viewIndex]: {
                    ...qs,
                    attempts: qs.attempts + 1,
                    status: "solved",
                    tier,
                    points,
                    answer: data.name as string,
                  },
                },
                runs: [...p.runs, { questionIndex: viewIndex, tier, points, arc }],
              }
            : p,
        );
        setRunSignal({
          id: stamp,
          to: newTotal,
          ms: TIER_CONFIG[tier].runMs,
          tier,
          final: viewIndex === DAILY_QUESTION_COUNT - 1,
        });
        setFx({ id: stamp, tier });
        setGuess("");
      } else {
        const wrong = qs.wrong.some((w) => w.toLowerCase() === text.toLowerCase()) ? qs.wrong : [text, ...qs.wrong];
        setProgress((p) =>
          p
            ? {
                ...p,
                q: { ...p.q, [viewIndex]: { ...qs, attempts: qs.attempts + 1, wrong } },
              }
            : p,
        );
        triggerNope();
        setGuess("");
        if (typeof data.suggestion === "string" && data.suggestion) {
          setSuggestion({ q: viewIndex, name: data.suggestion, typed: text });
        }
      }
    } catch {
      setMessage("Network hiccup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function nextQuestion() {
    setSuggestion(null);
    setViewIndex((v) => v + 1);
    setMessage(null);
  }

  function shareResults() {
    if (!progress || !daily) return;
    const grid = daily.questions
      .map((_, i) => {
        const st = progress.q[i];
        return st?.status === "solved" && st.tier ? TIER_CONFIG[st.tier].emoji : "⬛";
      })
      .join("");
    const text = `Luffillion ${daily.day}: ${totalScore}/${MAX_POINTS}\n${grid}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  if (loadError) {
    return <div className="grid min-h-screen place-items-center text-rose-300">{loadError}</div>;
  }

  if (!daily || !progress) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#05070f]">
        <div className="animate-pulse text-amber-200">Setting sail…</div>
      </div>
    );
  }

  const lowTime = remainingSec <= 8;
  const shownQuestion = !allDone ? viewIndex + 1 : DAILY_QUESTION_COUNT;

  return (
    <div id="game-root" className="fixed inset-0 overflow-hidden bg-[#05070f]">
      <PixelWorld key={daily.day} storageKey={`luffillion-pos:${daily.day}`} signal={runSignal} initialPos={Math.max(initialPos, journeyPos)} onStatus={handleWorld} />
      {sagaBanner && (
        <div
          key={sagaBanner.id}
          className="saga-banner pointer-events-none fixed inset-x-0 bottom-[118px] z-30 flex justify-center px-3"
        >
          <div className="px-box px-scan border-t-2 border-amber-300 px-6 py-2 text-center">
            <p className="text-sm tracking-[0.4em] text-amber-300">
              SAGA {sagaBanner.saga + 1} / {SAGAS.length}
            </p>
            <p className="font-pixel-display text-2xl font-bold text-white">{SAGAS[sagaBanner.saga].name}</p>
            <p className="text-base text-slate-400">{SAGAS[sagaBanner.saga].subtitle}</p>
          </div>
        </div>
      )}
      {fx && <Effects key={fx.id} tier={fx.tier} />}
      {allDone && showCountdown && (
        <CountdownScreen
          msLeft={nextRunAt - now}
          score={totalScore}
          saga={world.arc}
          solved={daily.questions.filter((_, i) => progress.q[i]?.status === "solved").length}
          copied={copied}
          onShare={shareResults}
          onClose={() => setShowCountdown(false)}
        />
      )}

      {/* ---------- Top HUD ---------- */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-20 mx-auto flex max-w-3xl items-start justify-between gap-3 px-3">
        <div className="px-box px-scan pointer-events-auto w-32 px-4 py-2 sm:w-44">
          <p className="text-sm tracking-[0.3em] text-slate-400">JOURNEY</p>
          <p className="text-3xl leading-none tabular-nums text-cyan-300">{world.pct}%</p>
          <p className="truncate text-sm leading-tight text-slate-400">
            {world.saga + 1}/{SAGAS.length} · {world.arc}
          </p>
        </div>

        <div className="pointer-events-auto flex flex-col items-center pt-2">
          <div className="flex gap-1">
            {daily.questions.map((_, i) => {
              const st = progress.q[i];
              const solved = st?.status === "solved" && st.tier;
              const expired = st?.status === "expired";
              const current = i === viewIndex && !allDone;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => i <= activeIndex && setViewIndex(i)}
                  disabled={i > activeIndex}
                  aria-label={`Question ${i + 1}`}
                  className={`h-4 w-4 border-2 transition sm:h-5 sm:w-5 ${
                    current
                      ? "border-white bg-[#ff4f7b]"
                      : solved
                        ? "border-amber-200 bg-amber-300"
                        : expired
                          ? "border-rose-900 bg-rose-700/80"
                          : "border-[#1c2a4a] bg-[#0b1426]"
                  } disabled:cursor-default`}
                />
              );
            })}
          </div>
          <p className="mt-1 text-sm tracking-[0.3em] text-slate-200 [text-shadow:0_1px_0_#000]">
            QUESTION {shownQuestion} OF {DAILY_QUESTION_COUNT}
          </p>
          <p className="font-pixel-display text-[11px] tracking-[0.25em] text-amber-200 [text-shadow:0_1px_0_#000]">
            LUFFILLION · DAILY · {daily.day}
          </p>
        </div>

        <div className="px-box px-scan pointer-events-auto w-32 px-4 py-2 text-right sm:w-44">
          <p className="text-sm tracking-[0.3em] text-slate-400">SCORE</p>
          <p className="text-3xl leading-none tabular-nums text-[#ff4f7b]">{totalScore}</p>
          <p className="text-sm leading-tight text-slate-500">of {MAX_POINTS}</p>
        </div>
      </div>

      {/* ---------- Run log toggle + drawer ---------- */}
      <button
        type="button"
        onClick={() => setLogOpen((o) => !o)}
        aria-label="Toggle run log"
        className="px-btn fixed left-3 top-[104px] z-30 grid h-9 w-10 place-items-center border-2 border-[#2a3a5c] bg-[#1a2540]/95 text-xl text-slate-200 hover:bg-[#24335a]"
      >
        {logOpen ? "✕" : "☰"}
      </button>
      {logOpen && (
        <div className="px-box px-scan fixed left-3 top-[150px] z-30 max-h-[50vh] w-72 overflow-y-auto p-4">
          <p className="mb-2 text-sm tracking-[0.3em] text-[#ff4f7b]">RUN LOG</p>
          {progress.runs.length === 0 ? (
            <p className="text-base text-slate-400">No runs yet. Land a correct answer to get Luffy moving.</p>
          ) : (
            <ul className="space-y-1.5">
              {[...progress.runs].reverse().map((r, idx) => (
                <li key={`${r.questionIndex}-${idx}`} className="flex items-center justify-between gap-2 bg-white/5 px-2 py-1 text-base">
                  <span className="min-w-0 truncate">
                    <span className={TIER_CONFIG[r.tier].text}>{TIER_LABELS[r.tier]}</span>
                    <span className="text-slate-500"> · Q{r.questionIndex + 1} · {r.arc}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-white">+{r.points}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 border-t border-white/10 pt-2 text-sm leading-snug text-slate-400">
            {TIER_ORDER.map((t) => (
              <div key={t} className="flex justify-between">
                <span className={TIER_CONFIG[t].text}>{TIER_LABELS[t]}</span>
                <span>{TIER_CONFIG[t].points} pts</span>
              </div>
            ))}
            <p className="mt-2 text-slate-500">Rarer answers send Luffy farther and faster. A Luffillion runs the whole series.</p>
          </div>
        </div>
      )}

      {/* ---------- Center prompt card ---------- */}
      <div className="pointer-events-none fixed inset-x-0 top-[112px] z-10 flex justify-center px-3 sm:top-[120px]">
        <div
          className={`px-box px-scan pointer-events-auto max-h-[calc(100vh-260px)] w-full max-w-xl overflow-y-auto px-6 py-5 ${
            nopeOn ? "nope" : ""
          }`}
        >
          {!allDone && question ? (
            <>
              <p className="text-base tracking-[0.35em] text-[#ff4f7b]">
                QUESTION {viewIndex + 1} OF {DAILY_QUESTION_COUNT}
              </p>
              <h2 className="mt-1 font-pixel-display text-2xl font-bold leading-tight text-white sm:text-3xl">
                {question.prompt}
              </h2>
              <p className="mt-1 text-base leading-snug text-slate-400">{question.hint}</p>
              {!qs.status && (
                <p className="mt-2 text-base tracking-[0.18em] text-slate-300">
                  ▼ {Object.values(question.counts).reduce((a, b) => a + b, 0)} valid answers · rarer runs farther ▼
                </p>
              )}
              {qs.status && <ResultPanel qs={qs} />}
            </>
          ) : (
            <Summary daily={daily} progress={progress} reveals={reveals} totalScore={totalScore} />
          )}
        </div>
      </div>

      {/* ---------- Bottom answer bar ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#040812] via-[#040812]/90 to-transparent pb-5 pt-12">
        {!qs.status && !allDone && qs.wrong.length > 0 && (
          <div className="mx-auto mb-2 flex max-w-2xl flex-wrap justify-center gap-1 px-3">
            {qs.wrong.slice(0, 8).map((w) => (
              <span key={w} className="bg-rose-950/80 px-2 text-base text-rose-200 line-through decoration-rose-400/70">
                {w}
              </span>
            ))}
          </div>
        )}
        {message && <p className="mb-2 text-center text-base text-rose-300">{message}</p>}
        {suggestion && suggestion.q === viewIndex && !qs.status && isActive && (
          <div className="mx-auto mb-2 flex max-w-2xl justify-center px-3">
            <button
              type="button"
              onClick={acceptSuggestion}
              disabled={busy}
              className="suggest-pop px-btn flex items-center gap-2 border-2 border-amber-300/80 bg-[#1a2540]/95 px-3 py-1 text-lg text-slate-200 hover:bg-[#24335a]"
            >
              <span className="text-slate-400">
                &ldquo;<span className="line-through decoration-rose-400/70">{suggestion.typed}</span>&rdquo; → did you mean
              </span>
              <span className="text-amber-200">{suggestion.name}</span>
              <span className="text-slate-400">?</span>
              <span className="ml-1 bg-amber-300 px-1.5 text-base text-amber-950">YES · TAB</span>
            </button>
          </div>
        )}

        <div className="mx-auto flex max-w-2xl items-center gap-3 px-3">
          {!allDone && !qs.status && isActive ? (
            <>
              <TimerRing remainingMs={remainingMs} seconds={remainingSec} low={lowTime} />
              <form onSubmit={submitGuess} className="flex flex-1 items-center gap-3">
                <div className="flex-1">
                  <input
                    autoFocus
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Tab" && suggestion && suggestion.q === viewIndex && !guess.trim()) {
                        e.preventDefault();
                        acceptSuggestion();
                      }
                    }}
                    maxLength={80}
                    placeholder="type one answer…"
                    aria-label="Your answer"
                    className="h-11 w-full border-2 border-cyan-400/70 bg-[#0a1428] px-3 text-xl tracking-wider text-white placeholder:text-slate-500 outline-none focus:border-cyan-300"
                  />
                  <div className="mt-1 h-1 bg-white/10">
                    <div
                      className={`h-full transition-[width] duration-100 ${lowTime ? "bg-rose-400" : "bg-cyan-400"}`}
                      style={{ width: `${(remainingMs / LIMIT_MS) * 100}%` }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={busy || !guess.trim()}
                  className="px-btn -mt-2 h-11 bg-[#c2345f] px-5 text-xl tracking-[0.3em] text-white transition hover:bg-[#d8406d] disabled:opacity-50"
                >
                  {busy ? "…" : "RUN"}
                </button>
              </form>
            </>
          ) : allDone ? (
            <div className="mx-auto flex gap-3">
              <button
                type="button"
                onClick={() => setShowCountdown(true)}
                className="px-btn h-11 bg-amber-400 px-5 text-xl tracking-[0.2em] text-amber-950 hover:bg-amber-300"
              >
                ⏳ NEXT RUN {formatCountdown(nextRunAt - now)}
              </button>
              <button
                type="button"
                onClick={shareResults}
                className="px-btn h-11 bg-[#c2345f] px-5 text-xl tracking-[0.25em] text-white hover:bg-[#d8406d]"
              >
                {copied ? "COPIED!" : "SHARE"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={nextQuestion}
              className="px-btn mx-auto h-11 bg-[#c2345f] px-6 text-xl tracking-[0.3em] text-white hover:bg-[#d8406d]"
            >
              {viewIndex === DAILY_QUESTION_COUNT - 1
                ? "SEE RESULTS ▸"
                : viewIndex + 1 < activeIndex
                  ? `BACK TO Q${activeIndex + 1} ▸`
                  : "NEXT ▸"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TimerRing({ remainingMs, seconds, low }: { remainingMs: number; seconds: number; low: boolean }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const frac = remainingMs / LIMIT_MS;
  return (
    <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#0a1428] ring-2 ring-[#1c2a4a]">
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={low ? "#fb7185" : "#22d3ee"}
          strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
        />
      </svg>
      <span className={`relative text-2xl tabular-nums ${low ? "timer-low text-rose-400" : "text-cyan-300"}`}>{seconds}</span>
    </div>
  );
}

function ResultPanel({ qs }: { qs: QState }) {
  const solved = qs.status === "solved" && qs.tier;
  return (
    <div className="mt-4 space-y-4">
      <div className="border-l-4 border-[#ff4f7b] bg-white/5 px-4 py-3">
        {solved ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-2 py-0.5 text-base tracking-wider ring-1 ${TIER_CONFIG[qs.tier!].badge}`}>
                {TIER_LABELS[qs.tier!].toUpperCase()}
              </span>
              <span className="text-2xl text-white">+{qs.points} pts</span>
            </div>
            <p className="mt-1 text-xl text-slate-200">
              ✓ <span className="text-white">{qs.answer}</span>
            </p>
            <p className="text-base text-slate-400">{TIER_CONFIG[qs.tier!].blurb}</p>
          </>
        ) : (
          <>
            <p className="text-2xl text-rose-300">TIME&apos;S UP</p>
            <p className="text-base text-slate-400">No points this time. Here&apos;s every answer.</p>
          </>
        )}
      </div>
      <p className="border border-dashed border-white/15 px-3 py-2 text-base text-slate-400">
        🔒 Every possible answer unlocks after question {DAILY_QUESTION_COUNT}. You&apos;ll get a recap where you can
        explore each question&apos;s full list.
      </p>
    </div>
  );
}

function AnswerList({ reveal, mine }: { reveal: Reveal; mine?: string }) {
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-base tracking-[0.25em] text-slate-300">ALL ANSWERS</h4>
          <span className="text-sm text-slate-500">
            {reveal.total} total · {reveal.totalFound} solves today
          </span>
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={`search ${reveal.total} answers…`}
          aria-label="Filter revealed answers"
          className="h-8 w-44 border border-white/15 bg-[#0a1428] px-2.5 text-base text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-400/70"
        />
      </div>
      <div className="space-y-3">
        {[...TIER_ORDER].reverse().map((t) => {
          const allItems = reveal.tiers[t] ?? [];
          const items = q ? allItems.filter((item) => item.name.toLowerCase().includes(q)) : allItems;
          if (items.length === 0) return null;
          return (
            <section key={t}>
              <h5 className={`mb-1 text-base tracking-wider ${TIER_CONFIG[t].text}`}>
                {TIER_LABELS[t].toUpperCase()}{" "}
                <span className="text-sm tracking-normal text-slate-500">
                  · {q ? `${items.length}/${allItems.length}` : allItems.length} · {TIER_CONFIG[t].points} pts
                </span>
              </h5>
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {items.map((item) => {
                  const isMine = mine === item.name;
                  return (
                    <li
                      key={item.name}
                      className={`flex items-center justify-between gap-2 px-2 py-0.5 text-base ${
                        isMine ? "bg-amber-300/15 text-amber-100 ring-1 ring-amber-300/60" : "bg-white/5 text-slate-300"
                      }`}
                    >
                      <span className="truncate">
                        {isMine && "✓ "}
                        {item.name}
                      </span>
                      <span className="shrink-0 text-sm text-slate-500">{item.found > 0 ? `×${item.found}` : "—"}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Summary({
  daily,
  progress,
  reveals,
  totalScore,
}: {
  daily: DailyResponse;
  progress: Progress;
  reveals: Record<number, Reveal>;
  totalScore: number;
}) {
  const solvedCount = daily.questions.filter((_, i) => progress.q[i]?.status === "solved").length;
  return (
    <div>
      <p className="text-base tracking-[0.35em] text-[#ff4f7b]">VOYAGE COMPLETE</p>
      <h2 className="mt-1 font-pixel-display text-3xl font-bold text-white">
        {totalScore} <span className="text-lg text-slate-400">/ {MAX_POINTS} pts</span>
      </h2>
      <p className="text-base text-slate-400">
        {solvedCount} of {DAILY_QUESTION_COUNT} answered. A brand-new run unlocks tomorrow.
      </p>
      <p className="mt-2 text-base tracking-[0.2em] text-amber-200">▼ ALL ANSWERS UNLOCKED · TAP A QUESTION ▼</p>

      <div className="mt-4 space-y-2">
        {daily.questions.map((q, i) => {
          const st = progress.q[i];
          const reveal = reveals[i];
          return (
            <details key={q.id} className="group bg-white/5 px-3 py-2 open:bg-white/[0.08] hover:bg-white/[0.08]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg">
                <span className="min-w-0">
                  <span className="block truncate">
                    <span className="inline-block text-amber-300 transition-transform group-open:rotate-90">▸</span>{" "}
                    <span className="text-slate-500">Q{i + 1}</span> <span className="text-white">{q.prompt}</span>
                  </span>
                  <span className="block pl-4 text-sm tracking-wider text-cyan-300/80 group-open:hidden">
                    Tap to discover all {Object.values(q.counts).reduce((x, y) => x + y, 0)} answers
                  </span>
                </span>
                {st?.status === "solved" && st.tier ? (
                  <span className={`shrink-0 ${TIER_CONFIG[st.tier].text}`}>
                    {st.answer} · +{st.points}
                  </span>
                ) : (
                  <span className="shrink-0 text-rose-300">missed</span>
                )}
              </summary>
              <div className="mt-2">
                {reveal ? (
                  <AnswerList reveal={reveal} mine={st?.status === "solved" ? st.answer : undefined} />
                ) : (
                  <p className="text-base text-slate-500">Loading answers…</p>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function formatCountdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function CountdownScreen({
  msLeft,
  score,
  saga,
  solved,
  copied,
  onShare,
  onClose,
}: {
  msLeft: number;
  score: number;
  saga: string;
  solved: number;
  copied: boolean;
  onShare: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#05070f]/80 px-4 backdrop-blur-sm">
      <div className="px-box px-scan countdown-pop w-full max-w-md px-7 py-6 text-center">
        <p className="text-base tracking-[0.4em] text-[#ff4f7b]">TODAY&apos;S VOYAGE IS OVER</p>
        <p className="mt-1 font-pixel-display text-3xl font-bold text-white">
          {score} <span className="text-lg text-slate-400">/ {MAX_POINTS} pts</span>
        </p>
        <p className="text-base text-slate-400">
          {solved} of {DAILY_QUESTION_COUNT} answered · Luffy reached <span className="text-amber-200">{saga}</span>
        </p>

        <p className="mt-5 text-sm tracking-[0.35em] text-slate-400">NEXT RUN IN</p>
        <p className="font-pixel-display text-6xl font-bold tabular-nums text-cyan-300 [text-shadow:0_3px_0_#0b1426]">
          {formatCountdown(msLeft)}
        </p>
        <p className="text-sm text-slate-500">New questions for everyone at 00:00 UTC.</p>

        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-btn h-11 bg-amber-400 px-5 text-xl tracking-[0.2em] text-amber-950 hover:bg-amber-300"
          >
            VIEW ANSWERS
          </button>
          <button
            type="button"
            onClick={onShare}
            className="px-btn h-11 bg-[#c2345f] px-5 text-xl tracking-[0.25em] text-white hover:bg-[#d8406d]"
          >
            {copied ? "COPIED!" : "SHARE"}
          </button>
        </div>
      </div>
    </div>
  );
}
