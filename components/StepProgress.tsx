'use client';

import { INVESTIGATION_STEPS } from '@/lib/constants';

interface StepProgressProps {
  currentStep: string;
  completedSteps: Set<string>;
}

export function StepProgress({ currentStep, completedSteps }: StepProgressProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-sm font-medium mb-4">Investigation Progress</h3>
      <div className="space-y-3">
        {INVESTIGATION_STEPS.map((step) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = currentStep === step.id;

          return (
            <div key={step.id} className="flex items-center gap-3">
              {/* Status Indicator */}
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-border" />
                )}
              </div>

              {/* Step Label */}
              <span
                className={`text-sm ${
                  isCompleted
                    ? 'text-muted-foreground'
                    : isCurrent
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground/60'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
