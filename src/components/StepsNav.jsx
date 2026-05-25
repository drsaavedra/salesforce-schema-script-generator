import { Fragment } from 'react';

const STEP_LABELS = ['Select Fields', 'Salesforce Bindings', 'Output'];

export default function StepsNav({ currentStep, onGoToStep }) {
  return (
    <nav className="steps-nav" aria-label="Steps">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const isDone = n < currentStep;
        const isCurrent = n === currentStep;
        return (
          <Fragment key={n}>
            {i > 0 && <span className="step-divider" aria-hidden="true" />}
            <div
              className={'step-nav-btn' + (isDone ? ' is-done' : '')}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => onGoToStep(n)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onGoToStep(n); }}
            >
              <span className="step-num">{n}</span>
              <span className="step-label">{label}</span>
            </div>
          </Fragment>
        );
      })}
    </nav>
  );
}
