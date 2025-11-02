// sound-manager.js - Система звуков для Minimorph Blackjack

class SoundManager {
  constructor() {
    this.sounds = {};
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.ambientMusic = null;
    this.initialized = false;
  }

  // Инициализация всех звуков
  init() {
    if (this.initialized) return;
    
    const soundFiles = {
      cardDeal: './assets/sounds/card-deal.mp3',
      cardFlip: './assets/sounds/card-flip.mp3',
      win: './assets/sounds/win.mp3',
      lose: './assets/sounds/lose.mp3',
      push: './assets/sounds/push.mp3',
      blackjack: './assets/sounds/blackjack.mp3',
      buttonClick: './assets/sounds/button-click.mp3',
      chips: './assets/sounds/chips.mp3',
      ambient: './assets/sounds/ambient-loop.mp3'
    };

    // Загрузить все звуки
    Object.keys(soundFiles).forEach(key => {
      try {
        this.sounds[key] = new Audio(soundFiles[key]);
        this.sounds[key].preload = 'auto';
        
        // Обработка ошибок загрузки
        this.sounds[key].addEventListener('error', (e) => {
          console.warn(`Failed to load sound: ${key}`, e);
        });
      } catch (error) {
        console.warn(`Error creating audio for ${key}:`, error);
      }
    });

    // Настроить фоновую музыку
    if (this.sounds.ambient) {
      this.ambientMusic = this.sounds.ambient;
      this.ambientMusic.loop = true;
      this.ambientMusic.volume = 0.3;
    }

    this.initialized = true;
    console.log('Sound system initialized');
  }

  // Воспроизвести звук
  play(soundName, volume = 1.0) {
    if (!this.sfxEnabled && soundName !== 'ambient') return;
    if (!this.musicEnabled && soundName === 'ambient') return;
    
    const sound = this.sounds[soundName];
    if (!sound) {
      console.warn(`Sound not found: ${soundName}`);
      return;
    }

    try {
      sound.volume = volume;
      sound.currentTime = 0;
      
      const playPromise = sound.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn(`Error playing sound ${soundName}:`, error);
        });
      }
    } catch (error) {
      console.warn(`Error playing sound ${soundName}:`, error);
    }
  }

  // Начать фоновую музыку
  startMusic() {
    if (!this.musicEnabled || !this.ambientMusic) return;
    
    try {
      this.ambientMusic.volume = 0.3;
      const playPromise = this.ambientMusic.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Error starting ambient music:', error);
        });
      }
    } catch (error) {
      console.warn('Error starting music:', error);
    }
  }

  // Остановить фоновую музыку
  stopMusic() {
    if (this.ambientMusic) {
      this.ambientMusic.pause();
      this.ambientMusic.currentTime = 0;
    }
  }

  // Установить громкость музыки
  setMusicVolume(volume) {
    if (this.ambientMusic) {
      this.ambientMusic.volume = Math.max(0, Math.min(1, volume));
    }
  }

  // Включить/выключить звуковые эффекты
  toggleSFX(enabled) {
    this.sfxEnabled = enabled;
  }

  // Включить/выключить музыку
  toggleMusic(enabled) {
    this.musicEnabled = enabled;
    
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  // Воспроизвести последовательность звуков (для раздачи карт)
  playSequence(soundName, count, delay = 300) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.play(soundName);
      }, i * delay);
    }
  }

  // Звуки игры
  playCardDeal() {
    this.play('cardDeal', 0.6);
  }

  playCardFlip() {
    this.play('cardFlip', 0.5);
  }

  playWin() {
    this.play('win', 0.8);
  }

  playLose() {
    this.play('lose', 0.7);
  }

  playPush() {
    this.play('push', 0.6);
  }

  playBlackjack() {
    this.play('blackjack', 0.9);
  }

  playButtonClick() {
    this.play('buttonClick', 0.4);
  }

  playChips() {
    this.play('chips', 0.5);
  }
}

// Экспорт
window.SoundManager = SoundManager;
