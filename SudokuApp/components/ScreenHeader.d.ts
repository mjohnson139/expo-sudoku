import type { ReactNode } from 'react';
import type { AppTheme } from '../utils/themes';

/**
 * Types for `components/ScreenHeader.js` — see `utils/themes.d.ts` for why the
 * three surviving shims exist and what keeps them honest.
 *
 * **This one is load-bearing.** The component destructures its props with a
 * default on `dense` alone, so inference from the JavaScript makes `subtitle`
 * and `onMenuPress` *required* — and every caller that passes neither, this
 * epic's included, fails to compile. What is optional is written here because
 * the JavaScript has no way to say it.
 *
 * `dense` is opt-in and every existing caller keeps exactly the header it has;
 * that is the pattern every shared-code extension in this epic follows
 * (plan's golden rule 2).
 */
declare function ScreenHeader(props: {
  title: string;
  subtitle?: string;
  theme: AppTheme;
  onHomePress: () => void;
  onMenuPress?: () => void;
  dense?: boolean;
  actions?: ReactNode;
}): JSX.Element;

export default ScreenHeader;
