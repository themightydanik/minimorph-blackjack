// service.js - Фоновий сервіс для Minimorph Blackjack

// Завантажуємо необхідні скрипти
MDS.load('./assets/js/database.js');

let db = null;
let playerAddress = null;

// Ініціалізація MDS
MDS.init(function(msg) {
  
  if (msg.event === "inited") {
    MDS.log("Minimorph Blackjack Service initialized");
    
    // Ініціалізуємо базу даних
    db = new GameDatabase();
    db.init(() => {
      MDS.log("Database initialized");
    });
    
    // Отримуємо адресу гравця
    MDS.cmd("getaddress", function(res) {
      if (res.status) {
        playerAddress = res.response.miniaddress;
        MDS.log("Player address: " + playerAddress);
      }
    });
  }
  
  // Новий блок - можливо нараховуємо щоденні бонуси
  if (msg.event === "NEWBLOCK") {
    MDS.log("New block detected: " + msg.data.txpow.header.block);
    // Тут можна додати логіку щоденних бонусів
  }
  
  // Новий баланс - оновлюємо UI
  if (msg.event === "NEWBALANCE") {
    MDS.log("Balance updated");
    // Можна відправити повідомлення у фронтенд
    MDS.comms.solo({
      event: "balance_updated",
      timestamp: Date.now()
    });
  }
  
  // Повідомлення від Maxima (для PvP)
  if (msg.event === "MAXIMA") {
    MDS.log("Maxima message received");
    handleMaximaMessage(msg.data);
  }
  
  // Таймер на 1 годину - щоденні винагороди
  if (msg.event === "MDS_TIMER_1HOUR") {
    MDS.log("Hourly timer - checking daily rewards");
    checkDailyRewards();
  }
  
  // Таймер на 10 секунд - перевірка активних PvP ігор
  if (msg.event === "MDS_TIMER_10SECONDS") {
    checkActivePvPGames();
  }
  
  // Shutdown
  if (msg.event === "MDS_SHUTDOWN") {
    MDS.log("Shutting down Minimorph Blackjack service");
  }
  
  // Повідомлення від фронтенду
  if (msg.event === "MDS_PENDING") {
    MDS.log("Pending transaction accepted");
  }
  
});

// Обробка Maxima повідомлень (для PvP)
function handleMaximaMessage(data) {
  try {
    const message = JSON.parse(data.data);
    
    switch (message.type) {
      case 'game_invite':
        // Запрошення до гри
        MDS.notify("Запрошення до Blackjack від " + message.from);
        storeGameInvite(message);
        break;
        
      case 'game_accept':
        // Гравець прийняв запрошення
        MDS.notify("Гравець прийняв запрошення!");
        break;
        
      case 'game_move':
        // Хід гравця (для майбутніх розширень)
        handleGameMove(message);
        break;
        
      case 'game_result':
        // Результат гри
        handleGameResult(message);
        break;
    }
  } catch (e) {
    MDS.log("Error parsing Maxima message: " + e);
  }
}

// Зберегти запрошення до гри
function storeGameInvite(invite) {
  // Зберігаємо через keypair для простоти
  MDS.keypair.get('pending_invites', function(res) {
    let invites = [];
    if (res.value) {
      invites = JSON.parse(res.value);
    }
    invites.push(invite);
    
    MDS.keypair.set('pending_invites', JSON.stringify(invites), function() {
      MDS.log("Game invite stored");
    });
  });
}

// Обробити хід гри (заготовка)
function handleGameMove(message) {
  MDS.log("Game move received: " + JSON.stringify(message));
  // Тут буде логіка обробки ходів у PvP
}

// Обробити результат гри
function handleGameResult(message) {
  MDS.log("Game result: " + message.result);
  
  if (db && playerAddress) {
    const rewards = db.calculateRewards(
      message.result, 
      message.betAmount, 
      'pvp'
    );
    
    db.updateProfileAfterGame(
      playerAddress,
      message.result,
      rewards.xp,
      rewards.points,
      function(success) {
        if (success) {
          MDS.notify(`Гру завершено! +${rewards.xp} XP, +${rewards.points} Points`);
        }
      }
    );
  }
}

// Перевірка щоденних винагород
function checkDailyRewards() {
  MDS.keypair.get('last_daily_reward', function(res) {
    const now = Date.now();
    const lastReward = res.value ? parseInt(res.value) : 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    if (now - lastReward > oneDayMs) {
      // Нараховуємо щоденну винагороду
      if (db && playerAddress) {
        const dailyBonus = { xp: 50, points: 25 };
        
        db.updateProfileAfterGame(
          playerAddress,
          'daily_bonus',
          dailyBonus.xp,
          dailyBonus.points,
          function(success) {
            if (success) {
              MDS.keypair.set('last_daily_reward', now.toString(), function() {
                MDS.notify("Щоденна винагорода: +50 XP, +25 Points!");
              });
            }
          }
        );
      }
    }
  });
}

// Перевірка активних PvP ігор
function checkActivePvPGames() {
  MDS.keypair.get('active_pvp_games', function(res) {
    if (!res.value) return;
    
    try {
      const games = JSON.parse(res.value);
      const now = Date.now();
      const timeout = 20 * 60 * 1000; // 20 хвилин
      
      games.forEach(game => {
        if (now - game.startTime > timeout && !game.completed) {
          MDS.log("Game timeout detected: " + game.gameId);
          // Тут можна додати логіку таймауту
        }
      });
    } catch (e) {
      MDS.log("Error checking PvP games: " + e);
    }
  });
}

// Допоміжна функція для відправки Maxima повідомлень
function sendMaximaMessage(toAddress, message) {
  const messageData = JSON.stringify(message);
  
  MDS.cmd(`maxima action:send to:${toAddress} application:minimorph_blackjack data:${messageData}`, 
    function(res) {
      if (res.status) {
        MDS.log("Maxima message sent successfully");
      } else {
        MDS.log("Failed to send Maxima message");
      }
    }
  );
}

// Статистика використання
MDS.log("=== Minimorph Blackjack Service Started ===");
MDS.log("Version: 1.0");
MDS.log("Ready to play!");
