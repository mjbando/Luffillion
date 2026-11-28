// Unlock every character skin for one captain account (e.g. the creator's "luffy" account,
// to preview all the art).
//
//   DATABASE_URL=postgres://... npx tsx scripts/unlock-all.ts <username> [--dry-run]
//
// Adds a character_unlocks row (source "grant") for every chest character and every former
// achievement recruit, retired ones included. Characters the captain already owns are left
// untouched, so running it again is harmless. --dry-run shows what would change and rolls back.
// Requires scripts/migrate-treasure-shop.sql to have been applied.
import "dotenv/config";
import pg from "pg";
import { CHEST_CHARACTERS } from "../src/data/chest-characters";
import { PLAYABLE_CHARACTERS } from "../src/data/playable-characters";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [username] = args.filter((a) => a !== "--dry-run");

if (!username) {
  console.error("Usage: npx tsx scripts/unlock-all.ts <username> [--dry-run]");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

// Gear 6 is the creator's own form and is granted by username, not by an unlock row.
const ALL_IDS = [
  ...PLAYABLE_CHARACTERS.filter((c) => c.achievementId).map((c) => c.id),
  ...CHEST_CHARACTERS.map((c) => c.id),
];

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<{ id: string; username: string }>(
      "SELECT id, username FROM captain_accounts WHERE username_key = lower($1)", [username.trim()]);
    const account = found.rows[0];
    if (!account) throw new Error(`No captain named "${username}".`);

    const inserted = await client.query<{ character_id: string }>(
      `INSERT INTO character_unlocks (account_id, character_id, source)
       SELECT $1, id, 'grant' FROM unnest($2::varchar[]) AS id
       ON CONFLICT DO NOTHING RETURNING character_id`, [account.id, ALL_IDS]);
    const total = await client.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM character_unlocks WHERE account_id = $1 AND character_id = ANY($2::varchar[])", [account.id, ALL_IDS]);

    const summary = `${account.username}: unlocked ${inserted.rowCount} new character(s); now owns ${total.rows[0].n} of ${ALL_IDS.length}.`;
    if (dryRun) {
      await client.query("ROLLBACK");
      console.log(`[dry run] ${summary} Nothing saved.`);
    } else {
      await client.query("COMMIT");
      console.log(summary);
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void main();
