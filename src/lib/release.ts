/**
 * Release switch for the treasure update: the Treasure Shop and chests, coins, the 184-character
 * chest roster, the Shop / Crew squares, the pixel sound button, and the reworked Online Ranked.
 *
 * While it is off, all of that code stays in the repo but players see the game as it was before:
 * the original four-tab menu and sound button, no shop or coins, no chest characters, and a
 * "Coming soon" screen for Ranked. The treasure and ranked APIs answer 404, and no query touches
 * the new coin tables, so the site runs fine before scripts/migrate-treasure-shop.sql is applied.
 *
 * To launch: run scripts/migrate-treasure-shop.sql on the production database (it also backfills
 * coins for everything players earned in the meantime), then set NEXT_PUBLIC_TREASURE_UPDATE=on
 * in the hosting environment and redeploy. NEXT_PUBLIC_ values are baked in at build time.
 */
export const UPDATE_LIVE = process.env.NEXT_PUBLIC_TREASURE_UPDATE === "on";
