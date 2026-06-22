import { useIntro } from '@/hooks/useIntro';

import { IntroSequence } from './IntroSequence';

/**
 * Overlays the first-run intro until it has been seen, then gets out of the way.
 * Rendered above the app so there's no flash of the library before the brand
 * moment. Guest-first: dismissing always lands in the app (no wall).
 */
export function IntroGate() {
  const seen = useIntro((s) => s.seen);
  const hydrated = useIntro((s) => s.hydrated);
  const markSeen = useIntro((s) => s.markSeen);

  if (hydrated && seen) return null;
  return <IntroSequence onDone={markSeen} />;
}
