'use client';

import { ThemeToggle } from '@/components/ThemeToggle';
import { InvestigationForm } from '@/components/InvestigationForm';
import { RecentCases } from '@/components/RecentCases';
import { HeroSlideUp, SlideUp, FadeIn } from '@/lib/motion-presets';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <FadeIn delay={0.1}>
          <header className="flex justify-between items-center mb-12">
            <Link href="/" className="text-3xl font-heading hover:opacity-80 transition-opacity">
              RangeScope
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/cases" className="text-sm font-medium hover:text-muted-foreground transition-colors">
                Case History
              </Link>
              <ThemeToggle />
            </div>
          </header>
        </FadeIn>

        <div className="text-center mt-12 mb-16">
          <HeroSlideUp delay={0.2}>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-heading mb-6">
              Wallet Forensics &<br />Investigation Agent
            </h2>
          </HeroSlideUp>
          <HeroSlideUp delay={0.3}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              An investigation memory system that learns patterns across cases
              and surfaces coordinated risk faster.
            </p>
          </HeroSlideUp>
        </div>

        {/* Investigation Form */}
        <SlideUp delay={0.4}>
          <div className="mb-16">
            <InvestigationForm />
          </div>
        </SlideUp>

        {/* Recent Cases */}
        <SlideUp delay={0.5}>
          <div className="max-w-3xl mx-auto">
            <h3 className="text-xl font-heading mb-6">Recent Investigations</h3>
            <RecentCases />
          </div>
        </SlideUp>
      </div>
    </main>
  );
}
