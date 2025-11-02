// dealer-ai.js - AI Дилер с персонажностями

class DealerAI {
  constructor(personality = 'friendly') {
    this.personality = personality;
    this.emotion = 'neutral';
  }

  // Получить эмоцию дилера на основе состояния игры
  getEmotion(gameState, dealerValue, playerValue) {
    if (!gameState) return 'neutral';
    
    switch(this.personality) {
      case 'friendly':
        return this.getFriendlyEmotion(gameState, dealerValue, playerValue);
      case 'sarcastic':
        return this.getSarcasticEmotion(gameState, dealerValue, playerValue);
      case 'cold':
        return 'neutral'; // Всегда нейтральный
      default:
        return 'neutral';
    }
  }

  getFriendlyEmotion(gameState, dealerValue, playerValue) {
    if (gameState === 'playing') {
      if (playerValue > 18) return 'impressed';
      if (playerValue < 12) return 'worried';
      return 'happy';
    }
    
    if (gameState === 'player_won' || gameState === 'player_blackjack') {
      return 'happy';
    }
    
    if (gameState === 'dealer_won') {
      return 'apologetic';
    }
    
    if (gameState === 'push') {
      return 'happy';
    }
    
    return 'neutral';
  }

  getSarcasticEmotion(gameState, dealerValue, playerValue) {
    if (gameState === 'playing') {
      if (playerValue > 18) return 'skeptical';
      if (playerValue < 12) return 'amused';
      return 'smirk';
    }
    
    if (gameState === 'player_won' || gameState === 'player_blackjack') {
      return 'disappointed';
    }
    
    if (gameState === 'dealer_won') {
      return 'confident';
    }
    
    if (gameState === 'push') {
      return 'indifferent';
    }
    
    return 'smirk';
  }

  // Получить эмодзи для эмоции
  getEmotionEmoji(emotion) {
    const emojis = {
      neutral: '😐',
      happy: '😊',
      impressed: '😲',
      worried: '😟',
      apologetic: '😅',
      smirk: '😏',
      skeptical: '🤨',
      amused: '😆',
      confident: '😎',
      disappointed: '😒',
      indifferent: '🙄'
    };
    
    return emojis[emotion] || '😐';
  }

  // Обновить аватар дилера
  updateDealerAvatar(emotion) {
    const avatar = document.getElementById('dealer-avatar');
    if (avatar) {
      avatar.textContent = this.getEmotionEmoji(emotion);
      avatar.style.animation = 'none';
      setTimeout(() => {
        avatar.style.animation = 'dealer-float 3s ease-in-out infinite';
      }, 10);
    }
  }

  // Получить сообщение дилера
  getMessage(action, gameState, playerValue, dealerValue) {
    const messages = this.getMessagesByPersonality();
    
    if (!messages[action]) return '';
    
    const messageArray = messages[action];
    return messageArray[Math.floor(Math.random() * messageArray.length)];
  }

  getMessagesByPersonality() {
    const personalities = {
      friendly: {
        welcome: [
          "Welcome to The Agora Deck! 😊",
          "Ready for some Blackjack?",
          "Good luck, friend!",
          "Let's have a great game!"
        ],
        deal: [
          "Here we go!",
          "Cards are dealt!",
          "Let's see what we have!",
          "Good luck! 🍀"
        ],
        playerHit: [
          "Another card coming up!",
          "Here you go!",
          "Feeling lucky?",
          "One more card!"
        ],
        playerStand: [
          "Alright, my turn!",
          "Good choice!",
          "Let me play now...",
          "Okay, dealer's turn!"
        ],
        dealerHit: [
          "I'll take another...",
          "Dealer hits",
          "One more for me",
          "Here goes..."
        ],
        dealerStand: [
          "I'll stand here",
          "That's enough for me",
          "Dealer stands",
          "Good hand!"
        ],
        playerWin: [
          "Congratulations! 🎉",
          "You won! Amazing!",
          "Great game!",
          "Well played!",
          "Winner! 🏆"
        ],
        dealerWin: [
          "I win this one... sorry!",
          "House wins, but great try!",
          "Better luck next round! 😊",
          "That's the way it goes sometimes!"
        ],
        playerBlackjack: [
          "BLACKJACK! Incredible! 🔥",
          "21! You did it!",
          "Perfect hand! Congrats!",
          "Amazing blackjack!"
        ],
        playerBust: [
          "Oh no! Bust! 😟",
          "That's too bad...",
          "Over 21, sorry!",
          "Don't worry, try again!"
        ],
        push: [
          "It's a tie! 🤝",
          "We're even!",
          "Push! Good game!",
          "Same score, nice!"
        ]
      },
      
      sarcastic: {
        welcome: [
          "Another brave soul... 😏",
          "Think you can beat the house?",
          "Let's see what you got...",
          "This should be interesting"
        ],
        deal: [
          "Here we go again...",
          "Let's get this over with",
          "Cards coming...",
          "Try not to bust immediately"
        ],
        playerHit: [
          "Really? Another one?",
          "Bold move...",
          "If you say so",
          "Your funeral 🙄"
        ],
        playerStand: [
          "Giving up already?",
          "Smart... maybe",
          "Finally!",
          "Probably for the best"
        ],
        dealerHit: [
          "Watch and learn...",
          "Let me show you how it's done",
          "Dealer hits, obviously",
          "Easy"
        ],
        dealerStand: [
          "Good enough",
          "Don't need more",
          "This'll do",
          "Perfect"
        ],
        playerWin: [
          "Lucky... very lucky 🙄",
          "Beginner's luck?",
          "Well, well...",
          "Enjoy it while it lasts",
          "Fine, you win this one"
        ],
        dealerWin: [
          "Called it! 😎",
          "House always wins",
          "Too easy",
          "Better luck next time, champ",
          "Naturally"
        ],
        playerBlackjack: [
          "Okay, that was good... I guess",
          "Show off 🙄",
          "Blackjack... impressive, I suppose",
          "Lucky 21"
        ],
        playerBust: [
          "Saw that coming 😏",
          "Classic mistake",
          "Too greedy",
          "And... bust. Shocking.",
          "Called it"
        ],
        push: [
          "Fine, we'll call it even",
          "Tie? Really?",
          "Push... boring",
          "Neither wins. Great."
        ]
      },
      
      cold: {
        welcome: [
          "...",
          "Begin.",
          "Ready.",
          "Proceed."
        ],
        deal: [
          "Dealing.",
          "Cards.",
          "Dealt.",
          "..."
        ],
        playerHit: [
          "Card.",
          "Another.",
          "Dealt.",
          "Hit."
        ],
        playerStand: [
          "Noted.",
          "Stand.",
          "Proceeding.",
          "..."
        ],
        dealerHit: [
          "Dealer hits.",
          "Card.",
          "...",
          "Hit."
        ],
        dealerStand: [
          "Stand.",
          "Dealer stands.",
          "...",
          "Done."
        ],
        playerWin: [
          "Win.",
          "Player wins.",
          "Victory.",
          "Payout."
        ],
        dealerWin: [
          "Loss.",
          "House wins.",
          "Dealer wins.",
          "Calculated."
        ],
        playerBlackjack: [
          "Blackjack.",
          "21.",
          "Player blackjack.",
          "Perfect."
        ],
        playerBust: [
          "Bust.",
          "Over 21.",
          "Loss.",
          "Eliminated."
        ],
        push: [
          "Push.",
          "Tie.",
          "Even.",
          "Draw."
        ]
      }
    };
    
    return personalities[this.personality] || personalities.friendly;
  }

  // Анимация реакции дилера
  animateReaction(emotion) {
    this.emotion = emotion;
    this.updateDealerAvatar(emotion);
    
    // Дополнительные визуальные эффекты
    const avatar = document.getElementById('dealer-avatar');
    if (!avatar) return;
    
    switch(emotion) {
      case 'impressed':
      case 'confident':
        avatar.style.transform = 'scale(1.1)';
        setTimeout(() => { avatar.style.transform = 'scale(1)'; }, 300);
        break;
      case 'disappointed':
      case 'worried':
        avatar.style.transform = 'translateY(10px)';
        setTimeout(() => { avatar.style.transform = 'translateY(0)'; }, 300);
        break;
      case 'happy':
      case 'amused':
        avatar.style.transform = 'rotate(5deg)';
        setTimeout(() => { 
          avatar.style.transform = 'rotate(-5deg)';
          setTimeout(() => { avatar.style.transform = 'rotate(0)'; }, 150);
        }, 150);
        break;
    }
  }

  // Задержка для реалистичности (дилер "думает")
  async dealerDelay() {
    const delays = {
      friendly: 1000,
      sarcastic: 1500,
      cold: 500
    };
    
    const delay = delays[this.personality] || 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Комментарий дилера к ходу
  commentOnMove(playerValue, dealerValue) {
    if (playerValue > 18 && this.personality === 'sarcastic') {
      return "Getting cocky, are we?";
    }
    
    if (playerValue < 12 && this.personality === 'friendly') {
      return "You might want to hit...";
    }
    
    if (dealerValue > playerValue && this.personality === 'cold') {
      return "Advantage: Dealer";
    }
    
    return null;
  }

  // Получить стиль персонажа для визуализации
  getPersonalityStyle() {
    const styles = {
      friendly: {
        color: '#00ff41',
        borderColor: '#00ff41',
        shadowColor: 'rgba(0, 255, 65, 0.5)'
      },
      sarcastic: {
        color: '#ff2a6d',
        borderColor: '#ff2a6d',
        shadowColor: 'rgba(255, 42, 109, 0.5)'
      },
      cold: {
        color: '#00f3ff',
        borderColor: '#00f3ff',
        shadowColor: 'rgba(0, 243, 255, 0.5)'
      }
    };
    
    return styles[this.personality] || styles.friendly;
  }

  // Применить стиль к аватару дилера
  applyPersonalityStyle() {
    const avatar = document.getElementById('dealer-avatar');
    if (!avatar) return;
    
    const style = this.getPersonalityStyle();
    avatar.style.borderColor = style.borderColor;
    avatar.style.boxShadow = `0 0 30px ${style.shadowColor}`;
    
    // Попробовать загрузить изображение дилера
    const dealerImg = new Image();
    dealerImg.src = `./assets/images/dealer/${this.personality}.png`;
    
    dealerImg.onload = () => {
      avatar.style.backgroundImage = `url(${dealerImg.src})`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
      avatar.textContent = ''; // Очистить emoji если изображение загрузилось
    };
    
    dealerImg.onerror = () => {
      // Fallback к emoji если изображение не найдено
      const emotion = this.getEmotionEmoji('neutral');
      avatar.textContent = emotion;
    };
  }
}

// Экспорт
window.DealerAI = DealerAI;
