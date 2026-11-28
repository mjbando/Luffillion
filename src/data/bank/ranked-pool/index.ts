import type { Question } from "../../questions";
import { POOL_FIGHTS_EVENTS } from "./fights-events";
import { POOL_PLACES_SAGAS } from "./places-sagas";
import { POOL_FRUITS_TECHNIQUES } from "./fruits-techniques";
import { POOL_PEOPLE } from "./people";
import { POOL_WORLD } from "./world";
import { POOL_MISC } from "./misc";

/** Every question written for the Ranked pool (ids start with "rk-"). Not part of the Daily Voyage. */
export const RANKED_POOL_QUESTIONS: Question[] = [
  ...POOL_FIGHTS_EVENTS,
  ...POOL_PLACES_SAGAS,
  ...POOL_FRUITS_TECHNIQUES,
  ...POOL_PEOPLE,
  ...POOL_WORLD,
  ...POOL_MISC,
];
