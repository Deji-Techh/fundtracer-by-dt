import React from 'react';

interface ProgressIndicatorProps {
  progress: number; // 0-100
  message?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  message,
  showPercentage = true,
  className = '',
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={`progress-indicator ${className}`}>
      {message && <p className="progress-message">{message}</p>}
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <span className="progress-percentage">{Math.round(clampedProgress)}%</span>
      )}
    </div>
  );
};

// Multi-step progress
interface MultiStepProgressProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export const MultiStepProgress: React.FC<MultiStepProgressProps> = ({
  steps,
  currentStep,
  className = '',
}) => {
  return (
    <div className={`multi-step-progress ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        
        return (
          <div
            key={step}
            className={`step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
          >
            <div className="step-indicator">
              {isCompleted ? '✓' : index + 1}
            </div>
            <span className="step-label">{step}</span>
          </div>
        );
      })}
    </div>
  );
};

// Analysis progress with detailed steps
export const AnalysisProgress: React.FC<{
  phase: 'fetching' | 'analyzing' | 'building' | 'complete';
  progress: number;
  details?: string;
}> = ({ phase, progress, details }) => {
  const phases = {
    fetching: 'Fetching transactions...',
    analyzing: 'Analyzing patterns...',
    building: 'Building visualization...',
    complete: 'Analysis complete!',
  };

  return (
    <div className="analysis-progress">
      <ProgressIndicator
        progress={progress}
        message={phases[phase]}
        showPercentage
      />
      {details && <p className="analysis-details">{details}</p>}
    </div>
  );
};

export default ProgressIndicator;
