// ui.js - UI Management для Minimorph Blackjack

class UIManager {
  constructor() {
    this.currentScreen = 'loading-screen';
    this.canvas = null;
    this.ctx = null;
  }

  // Показать экран
  showScreen(screenId) {
    // Скрыть все экраны
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    
    // Показать нужный экран
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add('active');
      this.currentScreen = screenId;
    }
  }

  // Обновить информацию игрока в главном меню
  updatePlayerInfo(balance, points, level) {
    const balanceEl = document.getElementById('player-balance');
    const pointsEl = document.getElementById('player-points');
    const levelEl = document.getElementById('player-level');
    
    if (balanceEl) balanceEl.textContent = `${balance} Minima`;
    if (pointsEl) pointsEl.textContent = points;
    if (levelEl) levelEl.textContent = level;
  }

  // Обновить баланс в игре
  updateGameBalance(balance, bet) {
    const gameBalanceEl = document.getElementById('game-balance');
    const currentBetEl = document.getElementById('current-bet');
    
    if (gameBalanceEl) gameBalanceEl.textContent = `${balance} Minima`;
    if (currentBetEl) currentBetEl.textContent = bet;
  }

  // Отрисовать карту
  renderCard(card, container, hidden = false) {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.suit}`;
    
    if (hidden) {
      cardEl.classList.add('hidden');
      
      // Попробовать загрузить изображение рубашки
      const backImg = new Image();
      backImg.src = './assets/images/cards/back.png';
      backImg.onload = () => {
        cardEl.innerHTML = `<img src="${backImg.src}" alt="Card back" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`;
      };
      backImg.onerror = () => {
        cardEl.innerHTML = '<span>?</span>';
      };
    } else {
      const suitSymbol = {
        'hearts': '♥',
        'diamonds': '♦',
        'clubs': '♣',
        'spades': '♠'
      };
      
      // Попробовать загрузить изображение карты
      const cardImg = new Image();
      cardImg.src = `./assets/images/cards/${card.suit}/${card.value}.png`;
      
      cardImg.onload = () => {
        cardEl.innerHTML = `<img src="${cardImg.src}" alt="${card.value} of ${card.suit}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`;
      };
      
      cardImg.onerror = () => {
        // Fallback к тексту если изображение не загрузилось
        cardEl.innerHTML = `
          <span style="font-size: 14px; position: absolute; top: 5px; left: 8px;">${card.value}</span>
          <span style="font-size: 32px;">${suitSymbol[card.suit]}</span>
          <span style="font-size: 14px; position: absolute; bottom: 5px; right: 8px;">${card.value}</span>
        `;
      };
    }
    
    container.appendChild(cardEl);
    
    // Воспроизвести звук раздачи карты
    if (window.soundManager) {
      window.soundManager.playCardDeal();
    }
  }

  // Отрисовать руку
  renderHand(hand, containerId, hideFirstCard = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    hand.forEach((card, index) => {
      const shouldHide = hideFirstCard && index === 1;
      this.renderCard(card, container, shouldHide);
    });
  }

  // Обновить значение руки
  updateHandValue(value, elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }

  // Показать сообщение дилера
  showDealerMessage(message, dealerStyle = 'friendly') {
    const speechBubble = document.getElementById('dealer-speech');
    if (!speechBubble) return;
    
    const messages = {
      friendly: {
        start: ["Good luck! 😊", "Let's play!", "Ready when you are!"],
        hit: ["Another card coming up!", "Here you go!", "Feeling lucky?"],
        stand: ["Alright, let me play now.", "Good choice!", "My turn!"],
        bust: ["Oh no! Better luck next time!", "That's too bad!", "Don't worry, try again!"],
        win: ["Congratulations! 🎉", "You did it!", "Great game!"],
        lose: ["I win this time!", "Better luck next round!", "House wins!"],
        push: ["It's a tie! Good game!", "We're even!", "Push!"]
      },
      sarcastic: {
        start: ["Let's see what you got 😏", "Try not to bust...", "This should be interesting"],
        hit: ["Really? Another one?", "Bold move...", "If you say so"],
        stand: ["Giving up already?", "Smart choice, maybe", "Finally!"],
        bust: ["Saw that coming 🙄", "Classic mistake", "Too bad, so sad"],
        win: ["Lucky... very lucky", "Beginner's luck?", "Well, well..."],
        lose: ["Called it!", "House always wins 😎", "Better luck next time, champ"],
        push: ["Fine, we'll call it even", "Tie? Really?", "Meh, push"]
      },
      cold: {
        start: ["...", "Begin.", "..."],
        hit: ["Card.", "Another.", "Dealt."],
        stand: ["Noted.", "Proceeding.", "..."],
        bust: ["Bust.", "Game over.", "Loss."],
        win: ["Win.", "Payout confirmed.", "Victory."],
        lose: ["Loss.", "House wins.", "Calculated."],
        push: ["Push.", "Even.", "Tie."]
      }
    };
    
    const styleMessages = messages[dealerStyle] || messages.friendly;
    const messageArray = styleMessages[message] || styleMessages.start;
    const randomMessage = messageArray[Math.floor(Math.random() * messageArray.length)];
    
    speechBubble.textContent = randomMessage;
    speechBubble.style.opacity = '1';
    
    // Скрыть через 3 секунды
    setTimeout(() => {
      speechBubble.style.opacity = '0.5';
    }, 3000);
  }

  // Включить/выключить кнопки управления
  setGameButtonsState(hit, stand, double) {
    const hitBtn = document.getElementById('btn-hit');
    const standBtn = document.getElementById('btn-stand');
    const doubleBtn = document.getElementById('btn-double');
    
    if (hitBtn) hitBtn.disabled = !hit;
    if (standBtn) standBtn.disabled = !stand;
    if (doubleBtn) doubleBtn.disabled = !double;
  }

  // Показать модальное окно результата
  showResultModal(result, amount, xp, points) {
    const modal = document.getElementById('result-modal');
    const title = document.getElementById('result-title');
    const amountEl = document.getElementById('result-amount');
    const xpEl = document.getElementById('result-xp');
    const pointsEl = document.getElementById('result-points');
    
    if (!modal) return;
    
    // Определяем заголовок и класс
    let titleText = '';
    let titleClass = '';
    
    switch(result) {
      case 'player_won':
        titleText = 'You Win! 🎉';
        titleClass = 'win';
        break;
      case 'player_blackjack':
        titleText = 'BLACKJACK! 🔥';
        titleClass = 'win';
        break;
      case 'dealer_won':
        titleText = 'Dealer Wins 😔';
        titleClass = 'lose';
        break;
      case 'push':
        titleText = 'Push! 🤝';
        titleClass = 'push';
        break;
    }
    
    title.textContent = titleText;
    title.className = `result-title ${titleClass}`;
    
    if (amount > 0) {
      amountEl.textContent = `+${amount} Minima`;
      amountEl.style.color = 'var(--green)';
    } else if (amount < 0) {
      amountEl.textContent = `${amount} Minima`;
      amountEl.style.color = 'var(--red)';
    } else {
      amountEl.textContent = 'No change';
      amountEl.style.color = 'var(--gold)';
    }
    
    xpEl.textContent = xp;
    pointsEl.textContent = points;
    
    modal.classList.add('active');
  }

  // Закрыть модальное окно
  closeResultModal() {
    const modal = document.getElementById('result-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // Обновить профиль
  updateProfile(profile) {
    document.getElementById('profile-level').textContent = profile.level || 1;
    document.getElementById('profile-xp').textContent = profile.xp || 0;
    document.getElementById('profile-games').textContent = profile.total_games || 0;
    document.getElementById('profile-wins').textContent = profile.wins || 0;
    document.getElementById('profile-losses').textContent = profile.losses || 0;
    document.getElementById('profile-blackjacks').textContent = profile.blackjacks || 0;
    document.getElementById('profile-points').textContent = profile.points || 0;
    
    // Расчет процента побед
    const winRate = profile.total_games > 0 
      ? Math.round((profile.wins / profile.total_games) * 100) 
      : 0;
    document.getElementById('profile-winrate').textContent = `${winRate}%`;
    
    // XP прогресс бар
    const xpForNextLevel = profile.level * 1000;
    const currentLevelXP = profile.xp % 1000;
    const progress = (currentLevelXP / 1000) * 100;
    document.getElementById('xp-progress').style.width = `${progress}%`;
  }

  // Отрисовать историю игр
  renderGameHistory(history) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    historyList.innerHTML = '';
    
    if (history.length === 0) {
      historyList.innerHTML = '<p style="text-align: center; opacity: 0.5;">No games yet</p>';
      return;
    }
    
    history.forEach(game => {
      const item = document.createElement('div');
      item.className = 'history-item';
      
      const resultColor = game.result.includes('won') ? 'var(--green)' : 
                         game.result === 'push' ? 'var(--gold)' : 'var(--red)';
      
      item.innerHTML = `
        <div>
          <strong style="color: ${resultColor}">${game.result.replace('_', ' ').toUpperCase()}</strong>
          <br>
          <small style="opacity: 0.7">${game.game_mode} • ${new Date(game.created_at).toLocaleDateString()}</small>
        </div>
        <div style="text-align: right;">
          <strong style="color: ${game.payout > 0 ? 'var(--green)' : 'var(--red)'}">
            ${game.payout > 0 ? '+' : ''}${game.payout} Minima
          </strong>
          <br>
          <small style="opacity: 0.7">+${game.xp_earned} XP</small>
        </div>
      `;
      
      historyList.appendChild(item);
    });
  }

  // Отрисовать таблицу лидеров
  renderLeaderboard(leaderboard) {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;
    
    leaderboardList.innerHTML = '';
    
    if (leaderboard.length === 0) {
      leaderboardList.innerHTML = '<p style="text-align: center; opacity: 0.5;">No players yet</p>';
      return;
    }
    
    leaderboard.forEach((player, index) => {
      const item = document.createElement('div');
      item.className = `leaderboard-item ${index < 3 ? 'top3' : ''}`;
      
      const medals = ['🥇', '🥈', '🥉'];
      const rank = index < 3 ? medals[index] : `#${index + 1}`;
      
      item.innerHTML = `
        <div class="rank">${rank}</div>
        <div style="flex: 1;">
          <strong>${player.username || player.player_address.substring(0, 12) + '...'}</strong>
          <br>
          <small style="opacity: 0.7">Level ${player.level} • ${player.wins}/${player.total_games} wins</small>
        </div>
        <div style="text-align: right;">
          <strong style="color: var(--neon-purple); font-size: 24px;">${player.xp}</strong>
          <br>
          <small style="opacity: 0.7">XP</small>
        </div>
      `;
      
      leaderboardList.appendChild(item);
    });
  }

  // Инициализация Canvas для анимаций (опционально)
  initCanvas() {
    this.canvas = document.getElementById('game-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.drawTable();
    }
  }

  // Отрисовать стол
  drawTable() {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Фон стола
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
    gradient.addColorStop(0, '#1a1f35');
    gradient.addColorStop(1, '#0a0e27');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Линии стола
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
    ctx.lineWidth = 2;
    
    // Горизонтальная линия посередине
    ctx.beginPath();
    ctx.moveTo(0, height/2);
    ctx.lineTo(width, height/2);
    ctx.stroke();
    
    // Неоновые эффекты по углам
    this.drawNeonCorner(50, 50);
    this.drawNeonCorner(width - 50, 50);
    this.drawNeonCorner(50, height - 50);
    this.drawNeonCorner(width - 50, height - 50);
  }

  // Нарисовать неоновый угол
  drawNeonCorner(x, y) {
    const ctx = this.ctx;
    
    ctx.strokeStyle = 'rgba(176, 38, 255, 0.5)';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Анимация раздачи карт (опционально)
  animateCardDeal(fromX, fromY, toX, toY, callback) {
    // Простая анимация через CSS уже есть в card-deal keyframes
    if (callback) callback();
  }

  // Показать уведомление
  showNotification(message, type = 'info') {
    // Можно добавить toast notifications
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  // Обновить доступные NFT
  renderNFTShop(dealers, skins) {
    const dealersGrid = document.getElementById('nft-dealers');
    const skinsGrid = document.getElementById('card-skins');
    
    if (dealersGrid) {
      dealersGrid.innerHTML = '<p style="opacity: 0.5;">Coming soon...</p>';
    }
    
    if (skinsGrid) {
      skinsGrid.innerHTML = '<p style="opacity: 0.5;">Coming soon...</p>';
    }
  }

  // Применить тему
