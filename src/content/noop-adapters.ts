// Ban no-op de phase 05 chay doc lap trong khi phase 06 (tooltip) va 07 (engine)
// con dang lam song song. Thay bang ban that khi chung merge.
import type {
  TooltipController, TooltipState, TranslateProvider,
} from '../shared/translate-contract.js';
import { TranslateError } from '../shared/translate-contract.js';

export function createNoopTooltip(): TooltipController {
  return {
    show(rect: DOMRect, state: TooltipState): void {
      console.log('[HT] tooltip.show', state.kind, `@${Math.round(rect.left)},${Math.round(rect.top)}`);
    },
    update(state: TooltipState): void {
      console.log('[HT] tooltip.update', state.kind);
    },
    hide(): void {
      console.log('[HT] tooltip.hide');
    },
    owns(): boolean {
      return false;
    },
  };
}

export function createNoopProvider(): TranslateProvider {
  return {
    async translate(text: string): Promise<string> {
      console.log('[HT] provider.translate (no-op)', text.length, 'ky tu');
      throw new TranslateError('UNKNOWN', 'Bộ dịch chưa được nối (phase 07).');
    },
  };
}
