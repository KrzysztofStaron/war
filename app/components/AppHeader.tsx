import Image from "next/image";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="mb-4 flex items-center justify-between gap-4">
      <Link
        href="/"
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <Image src="/logo.png" alt="SalesPatriot" width={36} height={36} />
        <span className="text-lg font-bold tracking-tight text-foreground">
          SalesPatriot
        </span>
      </Link>
      <nav className="flex items-center gap-4">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-wider text-foreground/60 hover:text-foreground transition-colors"
        >
          Classify
        </Link>
        <Link
          href="/costs"
          className="font-mono text-xs uppercase tracking-wider text-foreground/60 hover:text-foreground transition-colors"
        >
          Costs
        </Link>
      </nav>
    </header>
  );
}
