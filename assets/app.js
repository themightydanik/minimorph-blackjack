// app.js - Главная логика приложения Minimorph Blackjack

// Глобальные переменные
let ui;
let game;
let blockchain;
let db;
let dealer;
let playerAddress;
let playerBalance;
let currentGameMode = 'solo';
let currentBetAmount = 0;
let currentDealerStyle = 'friendly';
let isStakeGame = false;

// Инициализация приложения
function initApp() {
  console.log("Initializing Minimorph Blackjack...");
  
  // Инициализация UI менеджера
  ui = new UIManager();
  ui.showScreen('loading-screen');
  
  // Инициализация MDS
  MDS.init(function(msg) {
    if (msg.event === "inited") {
      console.log("MDS initialized");
      onMDSReady();
    } else if (msg.event === "NEWBALANCE") {
      console.log("Balance updated");
      updateBalance();
    } else if (msg.event === "NEWBLOCK") {
      console.log("New block:", msg.data.txpow.header.block);
    }
  });
}

// MDS готов
async function onMDSReady() {
  try {
    // Инициализация базы данных
    db = new GameDatabase();
    await new Promise(resolve => db.init(resolve));
    
    // Инициализация блокчейн менеджера
    blockchain = new MinimaGameManager();
    
    // Получить адрес игрока
    const addressData = await blockchain.getPlayerAddress();
    playerAddress = addressData.address;
    
    // Получить баланс
    const balance = await blockchain.getBalance();
    playerBalance = balance.sendable;
    
    // Получить или создать профиль
    db.getOrCreateProfile(playerAddress, (profile) => {
      // Обновить UI
      ui.updatePlayerInfo(playerBalance, profile.points, profile.level);
      
      // Показать главное меню
      setTimeout(() => {
        ui.showScreen('main-menu');
      }, 1000);
    });
    
    console.log("App initialized successfully");
    
  } catch (error) {
    console.error("Initialization error:", error);
    document.querySelector('.loading-text').textContent = 'Error: ' + error.message;
  }
}

// Обновить баланс
async function updateBalance() {
  try {
    const balance = await blockchain.getBalance();
    playerBalance = balance.sendable;
    ui.updatePlayerInfo(playerBalance, null, null);
  } catch (error) {
    console.error("Error updating balance:", error);
  }
}

// Показать настройку игры
function showGameSetup(mode) {
  currentGameMode = mode;
  
  const title = document.getElementById('setup-title');
  if (title) {
    title.textContent = mode === 'solo' ? 'Play vs AI' : 'Play vs Player';
  }
  
  // Для PvP скрываем выбор дилера
  const dealerSelect = document.getElementById('dealer-select');
  if (dealerSelect) {
    dealerSelect.style.display = mode === 'solo' ? 'block' : 'none';
  }
  
  // Обновить доступный баланс
  const availableBalance = document.getElementById('available-balance');
  if (availableBalance) {
    availableBalance.textContent = playerBalance;
  }
  
  ui.showScreen('game-setup');
}

// Установить режим игры (fun/stake)
function setGameMode(mode) {
  isStakeGame = mode === 'stake';
  
  const funBtn = document.getElementById('mode-fun');
  const stakeBtn = document.getElementById('mode-stake');
  const betOptions = document.getElementById('bet-options');
  
  if (mode === 'fun') {
    funBtn.classList.add('active');
    stakeBtn.classList.remove('active');
    betOptions.style.display = 'none';
  } else {
    funBtn.classList.remove('active');
    stakeBtn.classList.add('active');
    betOptions.style.display = 'block';
  }
}

// Установить ставку
function setBet(amount) {
  const betInput = document.getElementById('bet-amount');
  if (betInput) {
    betInput.value = amount;
  }
}

// Выбрать дилера
function selectDealer(style) {
  currentDealerStyle = style;
  
  document.querySelectorAll('.dealer-card').forEach(card => {
    card.classList.remove('active');
  });
  
  document.querySelector(`[data-dealer="${style}"]`).classList.add('active');
}

// Начать игру
async function startGame() {
  // Получить ставку
  const betInput = document.getElementById('bet-amount');
  currentBetAmount = isStakeGame && betInput ? parseFloat(betInput.value) : 0;
  
  // Проверить баланс
  if (isStakeGame && currentBetAmount > playerBalance) {
    alert('Insufficient balance!');
    return;
  }
  
  // Если PvP со ставкой - нужен второй игрок
  if (currentGameMode === 'pvp' && isStakeGame) {
    alert('PvP with stakes: Please wait for another player to join...\n(Feature coming soon)');
    return;
  }
  
  // SOLO игра со ставкой - создаем транзакцию
  if (currentGameMode === 'solo' && isStakeGame && currentBetAmount > 0) {
    ui.showTransactionIndicator('Placing bet on blockchain...', 'pending');
    
    try {
      const betResult = await blockchain.createBotStake(currentBetAmount);
      
      if (!betResult) {
        ui.showTransactionIndicator('Failed to place bet', 'error');
        await new Promise(resolve => setTimeout(resolve, 2000));
        ui.hideTransactionIndicator();
        ui.showScreen('game-setup');
        return;
      }
      
      if (betResult.error === 'insufficient_funds') {
        ui.showTransactionIndicator(`Insufficient funds. Need ${betResult.required} Minima`, 'error');
        await new Promise(resolve => setTimeout(resolve, 3000));
        ui.hideTransactionIndicator();
        ui.showScreen('game-setup');
        return;
      }
      
      console.log('Bet placed successfully:', betResult);
      ui.showTransactionIndicator(`Bet placed: ${currentBetAmount} Minima`, 'success');
      
      // Показать TX ID если есть
      if (betResult.transactionId) {
        ui.showBlockchainInfo(betResult.transactionId, 'Bet transaction confirmed');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      ui.hideTransactionIndicator();
      
      // Обновить баланс после ставки
      await updateBalance();
      
    } catch (error) {
      console.error('Error placing bet:', error);
      ui.showTransactionIndicator('Error: ' + error.message, 'error');
      await new Promise(resolve => setTimeout(resolve, 3000));
      ui.hideTransactionIndicator();
      ui.showScreen('game-setup');
      return;
    }
  }
  
  // Создать игру
  game = new BlackjackGame();
  dealer = new DealerAI(currentDealerStyle);
  
  // Показать игровой экран
  ui.showScreen('game-screen');
  ui.initCanvas();
  
  // Применить стиль дилера
  dealer.applyPersonalityStyle();
  
  // Обновить баланс в игре
  ui.updateGameBalance(playerBalance, currentBetAmount);
  
  // Приветствие дилера
  const welcomeMsg = dealer.getMessage('welcome');
  ui.showDealerMessage(welcomeMsg);
  
  // Задержка перед началом
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Начать раздачу
  dealCards();
}

// Раздача карт
async function dealCards() {
  const dealMsg = dealer.getMessage('deal');
  ui.showDealerMessage(dealMsg);
  
  // Начать игру
  const gameState = game.startGame(currentBetAmount, currentGameMode);
  
  // Анимация раздачи карт
  await new Promise(resolve => setTimeout(resolve, 500));
  ui.renderHand(gameState.playerHand, 'player-cards');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  ui.renderHand(gameState.dealerHand, 'dealer-cards', true);
  
  // Обновить значения
  ui.updateHandValue(gameState.playerValue, 'player-value');
  ui.updateHandValue(gameState.dealerHand[0].numValue, 'dealer-value');
  
  // Проверить на блекджек
  if (gameState.gameState === 'player_blackjack') {
    await handleBlackjack();
    return;
  }
  
  // Включить кнопки
  ui.setGameButtonsState(true, true, true);
  
  // Эмоция дилера
  const emotion = dealer.getEmotion('playing', gameState.dealerValue, gameState.playerValue);
  dealer.animateReaction(emotion);
}

// Игрок берет карту
async function playerHit() {
  if (!game) return;
  
  ui.setGameButtonsState(false, false, false);
  
  const hitMsg = dealer.getMessage('playerHit');
  ui.showDealerMessage(hitMsg);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const gameState = game.hit();
  if (!gameState) return;
  
  // Обновить карты и значения
  ui.renderHand(gameState.playerHand, 'player-cards');
  ui.updateHandValue(gameState.playerValue, 'player-value');
  
  // Проверить результат
  if (gameState.gameState === 'dealer_won') {
    await handleBust();
  } else if (gameState.gameState === 'player_won') {
    await handleGameEnd(gameState);
  } else {
    // Игра продолжается
    ui.setGameButtonsState(true, true, false);
    
    const emotion = dealer.getEmotion('playing', gameState.dealerValue, gameState.playerValue);
    dealer.animateReaction(emotion);
  }
}

// Игрок стоит
async function playerStand() {
  if (!game) return;
  
  ui.setGameButtonsState(false, false, false);
  
  const standMsg = dealer.getMessage('playerStand');
  ui.showDealerMessage(standMsg);
  
  await dealer.dealerDelay();
  
  const gameState = game.stand();
  if (!gameState) return;
  
  // Показать все карты дилера
  ui.renderHand(gameState.dealerHand, 'dealer-cards');
  ui.updateHandValue(gameState.dealerValue, 'dealer-value');
  
  // Задержка для эффекта
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await handleGameEnd(gameState);
}

// Игрок удваивает
async function playerDouble() {
  if (!game) return;
  
  // Проверить баланс
  if (isStakeGame && currentBetAmount * 2 > playerBalance) {
    alert('Insufficient balance to double!');
    return;
  }
  
  ui.setGameButtonsState(false, false, false);
  ui.showDealerMessage("Double down!");
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const gameState = game.double();
  if (!gameState) return;
  
  currentBetAmount = gameState.betAmount;
  ui.updateGameBalance(playerBalance, currentBetAmount);
  
  // Обновить карты
  ui.renderHand(gameState.playerHand, 'player-cards');
  ui.updateHandValue(gameState.playerValue, 'player-value');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Показать карты дилера
  ui.renderHand(gameState.dealerHand, 'dealer-cards');
  ui.updateHandValue(gameState.dealerValue, 'dealer-value');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await handleGameEnd(gameState);
}

// Обработать блекджек
async function handleBlackjack() {
  const blackjackMsg = dealer.getMessage('playerBlackjack');
  ui.showDealerMessage(blackjackMsg);
  
  dealer.animateReaction('impressed');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const gameState = game.getGameState();
  await handleGameEnd(gameState);
}

// Обработать перебор
async function handleBust() {
  const bustMsg = dealer.getMessage('playerBust');
  ui.showDealerMessage(bustMsg);
  
  dealer.animateReaction('confident');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const gameState = game.getGameState();
  await handleGameEnd(gameState);
}

// Завершение игры
async function handleGameEnd(gameState) {
  // Показать все карты
  ui.renderHand(gameState.dealerHand, 'dealer-cards');
  ui.updateHandValue(gameState.dealerValue, 'dealer-value');
  
  // Сообщение дилера
  let messageKey = '';
  if (gameState.gameState === 'player_won') messageKey = 'playerWin';
  else if (gameState.gameState === 'player_blackjack') messageKey = 'playerBlackjack';
  else if (gameState.gameState === 'dealer_won') messageKey = 'dealerWin';
  else if (gameState.gameState === 'push') messageKey = 'push';
  
  const endMsg = dealer.getMessage(messageKey);
  ui.showDealerMessage(endMsg);
  
  const emotion = dealer.getEmotion(gameState.gameState, gameState.dealerValue, gameState.playerValue);
  dealer.animateReaction(emotion);
  
  // Рассчитать выплату
  const payout = game.calculatePayout();
  let netProfit = payout - currentBetAmount;
  
  // Если игра со ставкой - обработать выплату на блокчейне
  if (isStakeGame && currentBetAmount > 0) {
    ui.showTransactionIndicator('Processing payout...', 'pending');
    
    try {
      if (gameState.gameState === 'player_won' || gameState.gameState === 'player_blackjack') {
        // Выплата выигрыша
        console.log(`Player won ${payout} Minima`);
        
        // Для демо: показываем что выплата отправлена
        await blockchain.payoutBotGame(payout);
        
        ui.showTransactionIndicator(`Won ${payout} Minima! 🎉`, 'success');
        
      } else if (gameState.gameState === 'push') {
        // При ничьей возвращаем ставку
        console.log('Push - returning bet');
        netProfit = 0;
        
        ui.showTransactionIndicator('Push - bet returned', 'success');
        
      } else {
        // Проигрыш - ставка уже списана
        console.log('Player lost - bet was burned');
        netProfit = -currentBetAmount;
        
        ui.showTransactionIndicator(`Lost ${currentBetAmount} Minima`, 'error');
      }
      
      // Задержка для показа индикатора
      await new Promise(resolve => setTimeout(resolve, 2000));
      ui.hideTransactionIndicator();
      
      // Обновить баланс
      await updateBalance();
      
    } catch (error) {
      console.error('Error processing payout:', error);
      ui.showTransactionIndicator('Error processing payout', 'error');
      await new Promise(resolve => setTimeout(resolve, 2000));
      ui.hideTransactionIndicator();
    }
  }
  
  // Рассчитать награды
  const rewards = db.calculateRewards(gameState.gameState, currentBetAmount, currentGameMode);
  
  // Добавить бонус за реальную ставку
  if (isStakeGame && currentBetAmount > 0) {
    rewards.xp = Math.floor(rewards.xp * 1.5);
    rewards.points = Math.floor(rewards.points * 1.5);
  }
  
  // Сохранить в базу
  const gameData = {
    playerAddress: playerAddress,
    mode: currentGameMode + (isStakeGame ? '_stake' : '_fun'),
    betAmount: currentBetAmount,
    result: gameState.gameState,
    payout: netProfit,
    xpEarned: rewards.xp,
    pointsEarned: rewards.points,
    playerHand: gameState.playerHand,
    dealerHand: gameState.dealerHand,
    duration: 60
  };
  
  db.saveGameHistory(gameData, () => {
    console.log("Game saved to history");
  });
  
  db.updateProfileAfterGame(
    playerAddress,
    gameState.gameState,
    rewards.xp,
    rewards.points,
    (success) => {
      if (success) {
        console.log("Profile updated");
      }
    }
  );
  
  // Показать результат
  await new Promise(resolve => setTimeout(resolve, 1500));
  ui.showResultModal(gameState.gameState, netProfit, rewards.xp, rewards.points);
}

// Играть снова
function playAgain() {
  ui.closeResultModal();
  startGame();
}

// Выход в меню
function exitToMenu() {
  ui.closeResultModal();
  showScreen('main-menu');
  updateBalance();
}

// Выход из игры
function exitGame() {
  if (confirm('Are you sure you want to exit the game?')) {
    showScreen('main-menu');
    updateBalance();
  }
}

// Показать экран
function showScreen(screenId) {
  ui.showScreen(screenId);
  
  // Загрузить данные для экрана
  if (screenId === 'profile') {
    loadProfile();
  } else if (screenId === 'leaderboard') {
    loadLeaderboard();
  } else if (screenId === 'customize') {
    loadCustomize();
  } else if (screenId === 'main-menu') {
    loadMainMenuData();
  }
}

// Загрузить профиль
function loadProfile() {
  if (!db || !playerAddress) return;
  
  db.getOrCreateProfile(playerAddress, (profile) => {
    ui.updateProfile(profile);
    
    db.getGameHistory(playerAddress, 20, (history) => {
      ui.renderGameHistory(history);
    });
  });
}

// Загрузить таблицу лидеров
function loadLeaderboard() {
  if (!db) return;
  
  db.getLeaderboard(10, (leaderboard) => {
    ui.renderLeaderboard(leaderboard);
  });
}

// Загрузить кастомизацию
function loadCustomize() {
  ui.renderNFTShop([], []);
}

// Загрузить данные главного меню
function loadMainMenuData() {
  if (!db || !playerAddress) return;
  
  db.getOrCreateProfile(playerAddress, (profile) => {
    ui.updatePlayerInfo(playerBalance, profile.points, profile.level);
  });
}

// Настройки
function toggleSound() {
  const toggle = document.getElementById('sound-toggle');
  const enabled = toggle ? toggle.checked : true;
  console.log("Sound:", enabled);
  
  if (db && playerAddress) {
    db.getPlayerSettings(playerAddress, (settings) => {
      settings.soundEnabled = enabled;
      db.updateSettings(playerAddress, settings);
    });
  }
}

function toggleMusic() {
  const toggle = document.getElementById('music-toggle');
  const enabled = toggle ? toggle.checked : true;
  console.log("Music:", enabled);
  
  if (db && playerAddress) {
    db.getPlayerSettings(playerAddress, (settings) => {
      settings.musicEnabled = enabled;
      db.updateSettings(playerAddress, settings);
    });
  }
}

function changeTheme() {
  const select = document.getElementById('theme-select');
  const theme = select ? select.value : 'neon';
  console.log("Theme:", theme);
  
  // Применить тему
  document.body.setAttribute('data-theme', theme);
  
  if (db && playerAddress) {
    db.getPlayerSettings(playerAddress, (settings) => {
      settings.tableTheme = theme;
      db.updateSettings(playerAddress, settings);
    });
  }
}

// Запуск приложения при загрузке
window.addEventListener('DOMContentLoaded', initApp);
