import confetti from 'canvas-confetti';
import SlotMachine, { Dealer } from '@js/Slot';
import SoundEffects from '@js/SoundEffects';
import { DEALERS } from '@js/dealers';

(() => {
  const dealers = DEALERS;

  const drawButton = document.getElementById('draw-button') as HTMLButtonElement | null;
  const fullscreenButton = document.getElementById('fullscreen-button') as HTMLButtonElement | null;
  const settingsButton = document.getElementById('settings-button') as HTMLButtonElement | null;
  const settingsWrapper = document.getElementById('settings') as HTMLDivElement | null;
  const settingsCloseButton = document.getElementById('settings-close') as HTMLButtonElement | null;
  const settingsResetButton = document.getElementById('settings-reset') as HTMLButtonElement | null;
  const sunburstSvg = document.getElementById('sunburst') as HTMLImageElement | null;
  const confettiCanvas = document.getElementById('confetti-canvas') as HTMLCanvasElement | null;
  const dealersCountInput = document.getElementById('dealers-count') as HTMLInputElement | null;
  const dealersPreviewText = document.getElementById('dealers-preview') as HTMLTextAreaElement | null;
  const removeWinnerCheckbox = document.getElementById('remove-from-list') as HTMLInputElement | null;
  const enableSoundCheckbox = document.getElementById('enable-sound') as HTMLInputElement | null;

  // Winner Announcement Dialog Elements
  const winnerModal = document.getElementById('winner-modal') as HTMLDivElement | null;
  const winnerDealer = document.getElementById('winner-dealer') as HTMLElement | null;
  const winnerAward = document.getElementById('winner-award') as HTMLElement | null;
  const winnerState = document.getElementById('winner-state') as HTMLElement | null;
  const winnerUnit = document.getElementById('winner-unit') as HTMLElement | null;
  const winnerCode = document.getElementById('winner-code') as HTMLElement | null;
  const winnerClose = document.getElementById('winner-close') as HTMLButtonElement | null;

  if (
    !drawButton
    || !sunburstSvg
    || !confettiCanvas
  ) {
    console.error('Core elements not found.');
    return;
  }

  const soundEffects = new SoundEffects();
  const CONFETTI_COLORS = ['#ffd700', '#ff4500', '#00e5ff', '#ff007f', '#76ff03', '#ffffff', '#ff9100'];
  let confettiAnimationId: number | null = null;

  const customConfetti = confettiCanvas instanceof HTMLCanvasElement
    ? confetti.create(confettiCanvas, {
      resize: true,
      useWorker: false
    })
    : confetti;

  const confettiAnimation = () => {
    const windowWidth = window.innerWidth || document.documentElement.clientWidth || 1000;
    const confettiScale = Math.max(0.6, Math.min(1.2, windowWidth / 1100));

    try {
      customConfetti({
        particleCount: 2,
        gravity: 0.75,
        spread: 100,
        origin: { y: 0.55 },
        colors: [CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]],
        scalar: confettiScale
      });
    } catch {
      // fallback
    }

    confettiAnimationId = window.requestAnimationFrame(confettiAnimation);
  };

  const stopWinningAnimation = () => {
    if (confettiAnimationId) {
      window.cancelAnimationFrame(confettiAnimationId);
      confettiAnimationId = null;
    }
    sunburstSvg.style.display = 'none';
  };

  const updateSettingsView = () => {
    if (dealersCountInput) {
      dealersCountInput.value = `${slotMachine.remainingCount} / ${dealers.length} Dealers`;
    }
    if (dealersPreviewText) {
      dealersPreviewText.value = slotMachine.remainingDealers
        .map((d) => `[${d.code}] ${d.dealerName} | ${d.unit} | ${d.state}${d.award ? ` (${d.award})` : ''}`)
        .join('\n');
    }
  };

  const onSpinStart = () => {
    stopWinningAnimation();
    if (winnerModal) winnerModal.classList.remove('winner-modal--visible');
    drawButton.disabled = true;
    if (settingsButton) settingsButton.disabled = true;
    soundEffects.spin(8.0);
  };

  const onSpinEnd = async (winner: Dealer) => {
    soundEffects.stopSpin();
    confettiAnimation();
    sunburstSvg.style.display = 'block';

    if (winnerDealer) winnerDealer.textContent = winner.dealerName;
    if (winnerAward) {
      if (winner.award) {
        winnerAward.textContent = winner.award;
        winnerAward.style.display = 'block';
      } else {
        winnerAward.textContent = '';
        winnerAward.style.display = 'none';
      }
    }
    if (winnerCode) winnerCode.textContent = winner.code;
    if (winnerUnit) winnerUnit.textContent = winner.unit;
    if (winnerState) winnerState.textContent = winner.state;

    await soundEffects.win();

    if (winnerModal) {
      winnerModal.classList.add('winner-modal--visible');
    }

    drawButton.disabled = false;
    if (settingsButton) settingsButton.disabled = false;
    updateSettingsView();
  };

  const slotMachine = new SlotMachine(dealers, {
    onSpinStart,
    onSpinEnd,
    removeWinner: removeWinnerCheckbox ? removeWinnerCheckbox.checked : true
  });

  updateSettingsView();

  drawButton.addEventListener('click', () => {
    slotMachine.spin();
  });

  if (winnerClose) {
    winnerClose.addEventListener('click', () => {
      if (winnerModal) winnerModal.classList.remove('winner-modal--visible');
      stopWinningAnimation();
    });
  }

  if (winnerModal) {
    const backdrop = winnerModal.querySelector('.winner-modal__backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        winnerModal.classList.remove('winner-modal--visible');
        stopWinningAnimation();
      });
    }
  }

  // Fullscreen button
  if (fullscreenButton) {
    fullscreenButton.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  // Settings
  if (settingsButton && settingsWrapper) {
    settingsButton.addEventListener('click', () => {
      updateSettingsView();
      settingsWrapper.style.display = 'block';
    });
  }

  if (settingsCloseButton && settingsWrapper) {
    settingsCloseButton.addEventListener('click', () => {
      settingsWrapper.style.display = 'none';
    });
  }

  if (settingsResetButton) {
    settingsResetButton.addEventListener('click', () => {
      slotMachine.resetPool();
      updateSettingsView();
    });
  }

  if (removeWinnerCheckbox) {
    removeWinnerCheckbox.addEventListener('change', () => {
      slotMachine.removeWinner = removeWinnerCheckbox.checked;
    });
  }

  if (enableSoundCheckbox) {
    enableSoundCheckbox.addEventListener('change', () => {
      soundEffects.mute = !enableSoundCheckbox.checked;
    });
  }

  // Spacebar triggers spin
  window.addEventListener('keydown', (e) => {
    const isSettingsOpen = settingsWrapper && settingsWrapper.style.display === 'block';
    if (e.code === 'Space' && !drawButton.disabled && !isSettingsOpen) {
      e.preventDefault();
      slotMachine.spin();
    }
  });
})();
