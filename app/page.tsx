import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-heading">RangeScope</h1>
          <ThemeToggle />
        </header>

        <div className="text-center mt-20">
          <h2 className="text-6xl font-heading mb-6">
            Wallet Forensics & <br />Investigation Agent
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            An investigation memory system that learns patterns across cases<br />
            and surfaces coordinated risk faster.
          </p>

          <div className="mt-12 p-8 bg-card rounded-2xl border border-border">
            <p className="text-sm text-muted-foreground">
              Setting up... This is a placeholder. Backend integration coming next.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
