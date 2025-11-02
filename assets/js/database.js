// database.js - Управління SQL базою даних для Minimorph Blackjack

class GameDatabase {
  constructor() {
    this.initialized = false;
  }

  // Ініціалізація бази даних
  init(callback) {
    const queries = [
      // Таблиця профілю гравця
      `CREATE TABLE IF NOT EXISTS player_profile (
        id INTEGER PRIMARY KEY,
        player_address VARCHAR(256) UNIQUE NOT NULL,
        username VARCHAR(64),
        xp BIGINT DEFAULT 0,
        points BIGINT DEFAULT 0,
        level INTEGER DEFAULT 1,
        total_games INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        blackjacks INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Таблиця історії ігор
      `CREATE TABLE IF NOT EXISTS game_history (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        player_address VARCHAR(256) NOT NULL,
        game_mode VARCHAR(20) NOT NULL,
        bet_amount DECIMAL(20,8) DEFAULT 0,
        result VARCHAR(20) NOT NULL,
        payout DECIMAL(20,8) DEFAULT 0,
        xp_earned INTEGER DEFAULT 0,
        points_earned INTEGER DEFAULT 0,
        player_hand VARCHAR(256),
        dealer_hand VARCHAR(256),
        game_duration INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Таблиця NFT інвентаря
      `CREATE TABLE IF NOT EXISTS nft_inventory (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        player_address VARCHAR(256) NOT NULL,
        nft_type VARCHAR(50) NOT NULL,
        nft_id VARCHAR(256) NOT NULL,
        nft_name VARCHAR(128),
        acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Таблиця налаштувань
      `CREATE TABLE IF NOT EXISTS player_settings (
        player_address VARCHAR(256) PRIMARY KEY,
        sound_enabled BOOLEAN DEFAULT TRUE,
        music_enabled BOOLEAN DEFAULT TRUE,
        dealer_style VARCHAR(50) DEFAULT 'friendly',
        table_theme VARCHAR(50) DEFAULT 'neon',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    let completed = 0;
    queries.forEach(query => {
      MDS.sql(query, (res) => {
        completed++;
        if (completed === queries.length) {
          this.initialized = true;
          console.log("База даних ініціалізована");
          if (callback) callback(true);
        }
      });
    });
  }

  // Отримати або створити профіль гравця
  getOrCreateProfile(playerAddress, callback) {
    const selectQuery = `SELECT * FROM player_profile WHERE player_address = '${playerAddress}'`;
    
    MDS.sql(selectQuery, (res) => {
      if (res.rows && res.rows.length > 0) {
        callback(res.rows[0]);
      } else {
        // Створюємо новий профіль
        const insertQuery = `INSERT INTO player_profile (player_address, xp, points, level) 
                            VALUES ('${playerAddress}', 0, 100, 1)`;
        MDS.sql(insertQuery, (res2) => {
          this.getOrCreateProfile(playerAddress, callback);
        });
      }
    });
  }

  // Оновити профіль після гри
  updateProfileAfterGame(playerAddress, result, xpEarned, pointsEarned, callback) {
    let wins = result === 'player_won' || result === 'player_blackjack' ? 1 : 0;
    let losses = result === 'dealer_won' ? 1 : 0;
    let blackjacks = result === 'player_blackjack' ? 1 : 0;

    const query = `UPDATE player_profile 
                   SET xp = xp + ${xpEarned},
                       points = points + ${pointsEarned},
                       total_games = total_games + 1,
                       wins = wins + ${wins},
                       losses = losses + ${losses},
                       blackjacks = blackjacks + ${blackjacks},
                       level = FLOOR((xp + ${xpEarned}) / 1000) + 1
                   WHERE player_address = '${playerAddress}'`;

    MDS.sql(query, (res) => {
      if (callback) callback(res.status);
    });
  }

  // Зберегти гру в історію
  saveGameHistory(gameData, callback) {
    const query = `INSERT INTO game_history 
                   (player_address, game_mode, bet_amount, result, payout, 
                    xp_earned, points_earned, player_hand, dealer_hand, game_duration)
                   VALUES (
                     '${gameData.playerAddress}',
                     '${gameData.mode}',
                     ${gameData.betAmount},
                     '${gameData.result}',
                     ${gameData.payout},
                     ${gameData.xpEarned},
                     ${gameData.pointsEarned},
                     '${JSON.stringify(gameData.playerHand)}',
                     '${JSON.stringify(gameData.dealerHand)}',
                     ${gameData.duration}
                   )`;

    MDS.sql(query, (res) => {
      if (callback) callback(res.status);
    });
  }

  // Отримати історію ігор
  getGameHistory(playerAddress, limit = 20, callback) {
    const query = `SELECT * FROM game_history 
                   WHERE player_address = '${playerAddress}' 
                   ORDER BY created_at DESC 
                   LIMIT ${limit}`;

    MDS.sql(query, (res) => {
      callback(res.rows || []);
    });
  }

  // Отримати таблицю лідерів
  getLeaderboard(limit = 10, callback) {
    const query = `SELECT player_address, username, xp, points, level, wins, total_games
                   FROM player_profile 
                   ORDER BY xp DESC 
                   LIMIT ${limit}`;

    MDS.sql(query, (res) => {
      callback(res.rows || []);
    });
  }

  // Додати NFT до інвентаря
  addNFTToInventory(playerAddress, nftType, nftId, nftName, callback) {
    const query = `INSERT INTO nft_inventory (player_address, nft_type, nft_id, nft_name)
                   VALUES ('${playerAddress}', '${nftType}', '${nftId}', '${nftName}')`;

    MDS.sql(query, (res) => {
      if (callback) callback(res.status);
    });
  }

  // Отримати NFT інвентар
  getNFTInventory(playerAddress, callback) {
    const query = `SELECT * FROM nft_inventory WHERE player_address = '${playerAddress}'`;

    MDS.sql(query, (res) => {
      callback(res.rows || []);
    });
  }

  // Витратити Points на покупку
  spendPoints(playerAddress, amount, callback) {
    const query = `UPDATE player_profile 
                   SET points = points - ${amount} 
                   WHERE player_address = '${playerAddress}' 
                   AND points >= ${amount}`;

    MDS.sql(query, (res) => {
      // Перевіряємо чи була виконана операція
      callback(res.status && res.count > 0);
    });
  }

  // Отримати налаштування гравця
  getPlayerSettings(playerAddress, callback) {
    const query = `SELECT * FROM player_settings WHERE player_address = '${playerAddress}'`;

    MDS.sql(query, (res) => {
      if (res.rows && res.rows.length > 0) {
        callback(res.rows[0]);
      } else {
        // Створити налаштування за замовчуванням
        const insertQuery = `INSERT INTO player_settings (player_address) VALUES ('${playerAddress}')`;
        MDS.sql(insertQuery, () => {
          this.getPlayerSettings(playerAddress, callback);
        });
      }
    });
  }

  // Оновити налаштування
  updateSettings(playerAddress, settings, callback) {
    const query = `UPDATE player_settings 
                   SET sound_enabled = ${settings.soundEnabled},
                       music_enabled = ${settings.musicEnabled},
                       dealer_style = '${settings.dealerStyle}',
                       table_theme = '${settings.tableTheme}',
                       updated_at = CURRENT_TIMESTAMP
                   WHERE player_address = '${playerAddress}'`;

    MDS.sql(query, (res) => {
      if (callback) callback(res.status);
    });
  }

  // Розрахунок XP та Points після гри
  calculateRewards(result, betAmount, mode) {
    let xp = 10; // Базове XP за участь
    let points = 5;

    if (result === 'player_blackjack') {
      xp += 50;
      points += 25;
    } else if (result === 'player_won') {
      xp += 30;
      points += 15;
    } else if (result === 'push') {
      xp += 5;
      points += 5;
    }

    // Бонус за PvP режим
    if (mode === 'pvp') {
      xp *= 2;
      points *= 2;
    }

    // Бонус за ставку (якщо була ставка)
    if (betAmount > 0) {
      xp += Math.floor(betAmount * 0.1);
      points += Math.floor(betAmount * 0.05);
    }

    return { xp, points };
  }
}

// Експорт
window.GameDatabase = GameDatabase;
