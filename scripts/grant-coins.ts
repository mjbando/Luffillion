// Grant coins to a captain account.
//
//   DATABASE_URL=postgres://... npx tsx scripts/grant-coins.ts <username> <amount> [ref] [--dry-run]
//
// Every grant is recorded in coin_ledger under (account, "grant", ref), so running the
// same command twice never pays twice. Use a new ref (default: grant-<amount>-<today>)
// to give the same captain another top-up. --dry-run shows the result and rolls back.
// Requires scripts/migrate-treasure-shop.sql to have been applied.
import "dotenv/config";
import pg from "pg";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [username, amountArg, refArg] = args.filter((a) => a !== "--dry-run");
const amount = Number(amountArg);

if (!username || !Number.isInteger(amount) || amount <= 0 || amount > 1_000_000) {
  console.error("Usage: npx tsx scripts/grant-coins.ts <username> <amount 1–1000000> [ref] [--dry-run]");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const ref = (refArg ?? `grant-${amount}-${new Date().toISOString().slice(0, 10)}`).slice(0, 64);
async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");
    const found = await client.query<{ id: string; username: string; coins: number }>(
      "SELECT id, username, coins FROM captain_accounts WHERE username_key = lower($1)", [username.trim()]);
    const account = found.rows[0];
    if (!account) throw new Error(`No captain named "${username}".`);

    const inserted = await client.query(
      `INSERT INTO coin_ledger (account_id, source, ref, amount) VALUES ($1, 'grant', $2, $3)
       ON CONFLICT DO NOTHING RETURNING amount`, [account.id, ref, amount]);

    if (inserted.rowCount === 0) {
      await client.query("ROLLBACK");
      console.log(`Already granted: ${account.username} received grant "${ref}" before. Balance stays ${account.coins.toLocaleString()} coins.`);
      console.log("Pass a different ref to give another top-up.");
    } else {
      const updated = await client.query<{ coins: number }>(
        "UPDATE captain_accounts SET coins = coins + $2 WHERE id = $1 RETURNING coins", [account.id, amount]);
      const coins = updated.rows[0].coins;
      if (dryRun) {
        await client.query("ROLLBACK");
        console.log(`[dry run] ${account.username}: ${account.coins.toLocaleString()} → ${coins.toLocaleString()} coins (grant "${ref}"). Nothing saved.`);
      } else {
        await client.query("COMMIT");
        console.log(`${account.username}: ${account.coins.toLocaleString()} → ${coins.toLocaleString()} coins (grant "${ref}").`);
      }
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
