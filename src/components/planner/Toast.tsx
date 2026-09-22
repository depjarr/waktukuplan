'use client';
import { usePlanner } from './PlannerProvider';

export function Toast() {
  const { toastState, dismissToast } = usePlanner();
  if (!toastState) return null;
  return (
    <div className="toast" role="status">
      <span>{toastState.msg}</span>
      {toastState.undo && (
        <button onClick={() => { toastState.undo?.(); dismissToast(); }}>Urungkan</button>
      )}
    </div>
  );
}
