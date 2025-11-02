// game.js - Логіка гри Блекджек

class BlackjackGame {
  constructor() {
    this.deck = [];
    this.playerHand = [];
    this.dealerHand = [];
    this.gameState = 'waiting'; // waiting, playing, player_won, dealer_won, push
    this.betAmount = 0;
    this.mode = 'solo'; // solo або pvp
  }

  // Створення колоди
  createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    this.deck = [];
    
    for (let suit of suits) {
      for (let value of values) {
        this.deck.push({
          suit: suit,
          value: value,
          numValue: this.getCardValue(value)
        });
      }
    }
    
    this.shuffleDeck();
  }

  // Перемішування колоди (Fisher-Yates)
  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  // Отримати числове значення карти
  getCardValue(value) {
    if (value === 'A') return 11;
    if (['J', 'Q', 'K'].includes(value)) return 10;
    return parseInt(value);
  }

  // Взяти карту з колоди
  drawCard() {
    return this.deck.pop();
  }

  // Підрахунок очків руки
  calculateHandValue(hand) {
    let value = 0;
    let aces = 0;
    
    for (let card of hand) {
      value += card.numValue;
      if (card.value === 'A') aces++;
    }
    
    // Перераховуємо тузи як 1, якщо перебір
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }
    
    return value;
  }

  // Початок гри
  startGame(betAmount, mode = 'solo') {
    this.betAmount = betAmount;
    this.mode = mode;
    this.createDeck();
    this.playerHand = [];
    this.dealerHand = [];
    
    // Роздача початкових карт
    this.playerHand.push(this.drawCard());
    this.dealerHand.push(this.drawCard());
    this.playerHand.push(this.drawCard());
    this.dealerHand.push(this.drawCard());
    
    this.gameState = 'playing';
    
    // Перевірка на блекджек
    if (this.calculateHandValue(this.playerHand) === 21) {
      this.gameState = 'player_blackjack';
    }
    
    return this.getGameState();
  }

  // Гравець бере карту
  hit() {
    if (this.gameState !== 'playing') return null;
    
    this.playerHand.push(this.drawCard());
    const playerValue = this.calculateHandValue(this.playerHand);
    
    if (playerValue > 21) {
      this.gameState = 'dealer_won';
    } else if (playerValue === 21) {
      this.stand(); // Автоматичний stand на 21
    }
    
    return this.getGameState();
  }

  // Гравець зупиняється
  stand() {
    if (this.gameState !== 'playing') return null;
    
    // Дилер бере карти до 17
    while (this.calculateHandValue(this.dealerHand) < 17) {
      this.dealerHand.push(this.drawCard());
    }
    
    const playerValue = this.calculateHandValue(this.playerHand);
    const dealerValue = this.calculateHandValue(this.dealerHand);
    
    if (dealerValue > 21) {
      this.gameState = 'player_won';
    } else if (playerValue > dealerValue) {
      this.gameState = 'player_won';
    } else if (dealerValue > playerValue) {
      this.gameState = 'dealer_won';
    } else {
      this.gameState = 'push';
    }
    
    return this.getGameState();
  }

  // Подвоїти ставку (якщо дозволено)
  double() {
    if (this.gameState !== 'playing' || this.playerHand.length !== 2) {
      return null;
    }
    
    this.betAmount *= 2;
    this.playerHand.push(this.drawCard());
    
    const playerValue = this.calculateHandValue(this.playerHand);
    if (playerValue > 21) {
      this.gameState = 'dealer_won';
    } else {
      this.stand();
    }
    
    return this.getGameState();
  }

  // Розділити пару (спрощена версія)
  split() {
    if (this.gameState !== 'playing' || this.playerHand.length !== 2) {
      return null;
    }
    
    if (this.playerHand[0].value !== this.playerHand[1].value) {
      return null;
    }
    
    // Спрощена логіка - просто повертаємо помилку
    // Повна реалізація split потребує окремої гри для кожної руки
    return { error: "Split not implemented in this version" };
  }

  // Отримати поточний стан гри
  getGameState() {
    return {
      playerHand: this.playerHand,
      dealerHand: this.dealerHand,
      playerValue: this.calculateHandValue(this.playerHand),
      dealerValue: this.calculateHandValue(this.dealerHand),
      gameState: this.gameState,
      betAmount: this.betAmount,
      mode: this.mode,
      // В режимі гриховаємо другу карту дилера
      dealerHiddenCard: this.gameState === 'playing' ? true : false
    };
  }

  // Розрахунок виграшу
  calculatePayout() {
    if (this.gameState === 'player_won') {
      return this.betAmount * 2; // Віддаємо ставку + виграш
    } else if (this.gameState === 'player_blackjack') {
      return this.betAmount * 2.5; // Блекджек платить 3:2
    } else if (this.gameState === 'push') {
      return this.betAmount; // Повертаємо ставку
    }
    return 0; // Програш
  }

  // Генерація seed для провідного рандому (для PvP)
  static generateRandomSeed() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Хеш seed для commitment scheme (для fair PvP)
  static async hashSeed(seed) {
    const encoder = new TextEncoder();
    const data = encoder.encode(seed);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Експорт
window.BlackjackGame = BlackjackGame;
