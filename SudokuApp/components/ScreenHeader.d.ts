import type { ReactNode } from 'react';
import type { AppTheme } from '../utils/themes';

/**
 * Types for `components/ScreenHeader.js` — see `utils/themes.d.ts` for why
 * these shims exist and what keeps them honest.
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
