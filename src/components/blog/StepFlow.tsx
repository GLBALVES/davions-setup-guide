interface StepFlowProps {
  steps: string[];
  currentStep: number;
  completedSteps: number[];
}

export const StepFlow = ({ steps, currentStep, completedSteps }: StepFlowProps) => {
  return (
    <div className="flex items-start mb-6">
      {steps.map((label, i) => {
        const isDone = completedSteps.includes(i);
        const isActive = i === currentStep;

        return (
          <div key={label} className="flex items-start flex-1 last:flex-initial">
            <div className="flex flex-col items-center">
              <div
                className={`w-[26px] h-[26px] rounded-full border flex items-center justify-center text-xs font-medium ${
                  isDone
                    ? "bg-green-50 border-green-300 text-green-700"
                    : isActive
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 text-center w-14">
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px bg-border mt-[13px] mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
};
