export default function RankedUsername({ username, className = "" }: { username: string; className?: string }) {
  const isDeveloper = username.trim().toLowerCase() === "luffy";

  return (
    <span className={className} aria-label={isDeveloper ? `${username}, developer` : username}>
      <span>{username}</span>
      {isDeveloper && (
        <span aria-hidden="true" className="ml-1 border border-amber-300/40 bg-amber-300/10 px-1 text-[10px] tracking-wider text-amber-200">
          DEV
        </span>
      )}
    </span>
  );
}