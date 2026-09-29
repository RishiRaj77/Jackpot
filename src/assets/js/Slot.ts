export interface Dealer {
  state: string;
  unit: string;
  code: string;
  dealerName: string;
  award: string;
}

export interface ReelConfig {
  containerSelector: string;
  itemHeight?: number;
  initialValue?: string;
}

/** Individual animated slot reel */
export class SlotReel {
  private container: HTMLElement | null;
  private currentValue: string;
  private currentAnimation: Animation | null = null;

  constructor({ containerSelector, initialValue = '---' }: ReelConfig) {
    this.container = document.querySelector(containerSelector);
    this.currentValue = initialValue;
    this.setStaticItem(initialValue);
  }

  public setStaticItem(text: string): void {
    if (!this.container) return;
    this.container.innerHTML = `<div>${text}</div>`;
    this.container.style.transform = '';
    this.currentValue = text;
  }

  public async spinToTarget(
    targetValue: string,
    candidates: string[],
    durationMs: number,
    itemCount = 30
  ): Promise<void> {
    if (!this.container) return;

    if (this.currentAnimation) {
      try {
        this.currentAnimation.cancel();
      } catch {
        // ignore
      }
      this.currentAnimation = null;
    }

    // Accurately measure the slot height directly from parent .slot__inner
    const slotInner = this.container.parentElement;
    const itemHeight = (slotInner && slotInner.clientHeight > 0)
      ? slotInner.clientHeight
      : 60;

    // Build shuffled sequence starting with the current value
    const sequence: string[] = [this.currentValue];
    const pool = candidates.filter((c) => c !== targetValue);

    // Intermediate spinning random choices
    for (let i = 1; i < itemCount - 1; i += 1) {
      const rand = pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : targetValue;
      sequence.push(rand);
    }

    // Last item is the guaranteed target winner
    sequence.push(targetValue);

    // Populate all sequence items into reel container
    const fragment = document.createDocumentFragment();
    sequence.forEach((val) => {
      const el = document.createElement('div');
      el.textContent = val;
      fragment.appendChild(el);
    });
    this.container.innerHTML = '';
    this.container.appendChild(fragment);

    // Total distance from item 0 to last item
    const totalDistance = (sequence.length - 1) * itemHeight;

    const animation = this.container.animate(
      [
        { transform: 'translateY(0)', filter: 'blur(0)' },
        { filter: 'blur(0.8px)', offset: 0.1 },
        { filter: 'blur(0.8px)', offset: 0.7 },
        { transform: `translateY(-${totalDistance}px)`, filter: 'blur(0)' }
      ],
      {
        duration: durationMs,
        easing: 'cubic-bezier(0.15, 0.85, 0.35, 1)',
        fill: 'forwards'
      }
    );
    this.currentAnimation = animation;

    await new Promise<void>((resolve) => {
      animation.onfinish = () => resolve();
    });

    // Cleanly cancel animation and set single winner item in DOM
    animation.cancel();
    this.currentAnimation = null;
    this.container.innerHTML = `<div>${targetValue}</div>`;
    this.container.style.transform = '';
    this.currentValue = targetValue;
  }
}

export interface SlotMachineConfig {
  onSpinStart?: () => void;
  onSpinEnd?: (winner: Dealer) => void;
  removeWinner?: boolean;
}

/** Central Jackpot Coordinator controlling all 4 horizontal carousel fields */
export default class SlotMachine {
  private reelState: SlotReel;
  private reelUnit: SlotReel;
  private reelCode: SlotReel;
  private reelDealer: SlotReel;

  private allDealers: Dealer[];
  private activePool: Dealer[];
  private shouldRemoveWinner: boolean;

  private onSpinStart?: () => void;
  private onSpinEnd?: (winner: Dealer) => void;

  constructor(dealers: Dealer[], config: SlotMachineConfig = {}) {
    this.allDealers = [...dealers];
    this.activePool = [...dealers];
    this.shouldRemoveWinner = config.removeWinner ?? true;
    this.onSpinStart = config.onSpinStart;
    this.onSpinEnd = config.onSpinEnd;

    this.reelState = new SlotReel({ containerSelector: '#reel-state', initialValue: 'STATE' });
    this.reelUnit = new SlotReel({ containerSelector: '#reel-unit', initialValue: 'UNIT' });
    this.reelCode = new SlotReel({ containerSelector: '#reel-code', initialValue: 'DEALER CODE' });
    this.reelDealer = new SlotReel({ containerSelector: '#reel-dealer', initialValue: 'DEALER NAME' });
  }

  get remainingCount(): number {
    return this.activePool.length;
  }

  get remainingDealers(): Dealer[] {
    return this.activePool;
  }

  set removeWinner(val: boolean) {
    this.shouldRemoveWinner = val;
  }

  get removeWinner(): boolean {
    return this.shouldRemoveWinner;
  }

  public resetPool(): void {
    this.activePool = [...this.allDealers];
  }

  public async spin(): Promise<Dealer | null> {
    if (this.activePool.length === 0) {
      this.resetPool();
    }

    if (this.onSpinStart) {
      this.onSpinStart();
    }

    // Pick random winning dealer from active pool
    const winnerIndex = Math.floor(Math.random() * this.activePool.length);
    const winner = this.activePool[winnerIndex];

    if (this.shouldRemoveWinner) {
      this.activePool.splice(winnerIndex, 1);
    }

    // Extract unique candidate options for spinning reels
    const stateCandidates = [...new Set(this.allDealers.map((d) => d.state))];
    const unitCandidates = [...new Set(this.allDealers.map((d) => d.unit))];
    const codeCandidates = [...new Set(this.allDealers.map((d) => d.code))];
    const dealerCandidates = [...new Set(this.allDealers.map((d) => d.dealerName))];

    // Staggered spin execution (suspense timing)
    const pState = this.reelState.spinToTarget(winner.state, stateCandidates, 2000, 24);
    const pUnit = this.reelUnit.spinToTarget(winner.unit, unitCandidates, 2600, 28);
    const pCode = this.reelCode.spinToTarget(winner.code, codeCandidates, 3200, 32);
    const pDealer = this.reelDealer.spinToTarget(winner.dealerName, dealerCandidates, 3800, 36);

    await Promise.all([pState, pUnit, pCode, pDealer]);

    if (this.onSpinEnd) {
      this.onSpinEnd(winner);
    }

    return winner;
  }
}
