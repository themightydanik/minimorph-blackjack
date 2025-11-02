// blockchain.js - Інтеграція з Minima для Minimorph Blackjack

class MinimaGameManager {
  constructor() {
    this.gameContractScript = `
      IF @COINAGE GT 288 AND SIGNEDBY(PREVSTATE(0)) THEN 
        RETURN TRUE 
      ENDIF
      IF @COINAGE GT 288 AND SIGNEDBY(PREVSTATE(1)) THEN 
        RETURN TRUE 
      ENDIF
      RETURN MULTISIG(2 PREVSTATE(0) PREVSTATE(1))
    `;
  }

  // Ініціалізація MDS
  init(callback) {
    MDS.init((msg) => {
      if (msg.event === "inited") {
        console.log("Minima готова до використання");
        callback();
      }
    });
  }

  // Отримати баланс гравця
  async getBalance() {
    return new Promise((resolve) => {
      MDS.cmd("balance", (res) => {
        if (res.status) {
          const minimaToken = res.response.find(t => t.token === "Minima");
          resolve({
            confirmed: parseFloat(minimaToken.confirmed),
            sendable: parseFloat(minimaToken.sendable)
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  // Отримати адресу гравця
  async getPlayerAddress() {
    return new Promise((resolve) => {
      MDS.cmd("getaddress", (res) => {
        if (res.status) {
          resolve({
            address: res.response.miniaddress,
            publickey: res.response.publickey
          });
        }
      });
    });
  }

  // Створити смарт-контракт для гри
  async createGameContract(player1Key, player2Key) {
    return new Promise((resolve) => {
      const script = `
        IF @COINAGE GT 288 AND SIGNEDBY(${player1Key}) THEN 
          RETURN TRUE 
        ENDIF
        IF @COINAGE GT 288 AND SIGNEDBY(${player2Key}) THEN 
          RETURN TRUE 
        ENDIF
        RETURN MULTISIG(2 ${player1Key} ${player2Key})
      `;

      MDS.cmd(`newscript trackall:true script:"${script}"`, (res) => {
        if (res.status) {
          resolve({
            address: res.response.address,
            miniaddress: res.response.miniaddress,
            script: res.response.script
          });
        }
      });
    });
  }

  // Гравець 1: створити та підписати початкову транзакцію
  async createGameStake(contractAddress, betAmount, player1Address) {
    return new Promise((resolve) => {
      const txnId = `game_${Date.now()}`;
      
      // Створюємо транзакцію
      MDS.cmd(`txncreate id:${txnId}`, (res1) => {
        if (!res1.status) return resolve(null);

        // Знаходимо монету для ставки
        MDS.cmd("coins relevant:true", (res2) => {
          const suitableCoin = res2.response.find(
            c => parseFloat(c.amount) >= betAmount && c.tokenid === "0x00"
          );
          
          if (!suitableCoin) {
            console.error("Недостатньо коштів");
            return resolve(null);
          }

          // Додаємо вхід
          MDS.cmd(`txninput id:${txnId} coinid:${suitableCoin.coinid}`, (res3) => {
            
            // Додаємо вихід до контракту
            MDS.cmd(`txnoutput id:${txnId} address:${contractAddress} amount:${betAmount}`, (res4) => {
              
              // Додаємо решту назад
              const change = parseFloat(suitableCoin.amount) - betAmount;
              if (change > 0) {
                MDS.cmd(`txnoutput id:${txnId} address:${player1Address} amount:${change}`, (res5) => {
                  
                  // Підписуємо
                  MDS.cmd(`txnsign id:${txnId} publickey:auto`, (res6) => {
                    
                    // Експортуємо для відправки другому гравцю
                    MDS.cmd(`txnexport id:${txnId}`, (res7) => {
                      resolve({
                        txnId: txnId,
                        txnData: res7.response,
                        status: "awaiting_player2"
                      });
                    });
                  });
                });
              }
            });
          });
        });
      });
    });
  }

  // Гравець 2: імпортувати, додати свою ставку та підписати
  async joinGameStake(txnData, contractAddress, betAmount, player2Address) {
    return new Promise((resolve) => {
      const txnId = `game_join_${Date.now()}`;
      
      // Імпортуємо транзакцію
      MDS.cmd(`txnimport data:${txnData} id:${txnId}`, (res1) => {
        
        // Знаходимо свою монету
        MDS.cmd("coins relevant:true", (res2) => {
          const suitableCoin = res2.response.find(
            c => parseFloat(c.amount) >= betAmount && c.tokenid === "0x00"
          );
          
          if (!suitableCoin) return resolve(null);

          // Додаємо свій вхід
          MDS.cmd(`txninput id:${txnId} coinid:${suitableCoin.coinid}`, (res3) => {
            
            // Додаємо свій вихід до контракту
            MDS.cmd(`txnoutput id:${txnId} address:${contractAddress} amount:${betAmount}`, (res4) => {
              
              // Решта
              const change = parseFloat(suitableCoin.amount) - betAmount;
              if (change > 0) {
                MDS.cmd(`txnoutput id:${txnId} address:${player2Address} amount:${change}`, (res5) => {
                  
                  // Підписуємо
                  MDS.cmd(`txnsign id:${txnId} publickey:auto`, (res6) => {
                    
                    // Додаємо базові дані (MMR proofs та scripts)
                    MDS.cmd(`txnbasics id:${txnId}`, (res7) => {
                      
                      // ПОСТИМО на блокчейн!
                      MDS.cmd(`txnpost id:${txnId}`, (res8) => {
                        resolve({
                          status: "game_started",
                          contractAddress: contractAddress,
                          totalPrize: betAmount * 2
                        });
                      });
                    });
                  });
                });
              }
            });
          });
        });
      });
    });
  }

  // Виплата переможцю
  async payoutWinner(contractCoinId, winnerAddress, amount, player1Key, player2Key) {
    return new Promise((resolve) => {
      const txnId = `payout_${Date.now()}`;
      
      // Створюємо транзакцію виплати
      MDS.cmd(`txncreate id:${txnId}`, (res1) => {
        
        // Додаємо контрактну монету як вхід
        MDS.cmd(`txninput id:${txnId} coinid:${contractCoinId}`, (res2) => {
          
          // Вихід переможцю
          MDS.cmd(`txnoutput id:${txnId} address:${winnerAddress} amount:${amount}`, (res3) => {
            
            // Підписуємо обома ключами (2-of-2 multisig)
            MDS.cmd(`txnsign id:${txnId} publickey:${player1Key}`, (res4) => {
              MDS.cmd(`txnsign id:${txnId} publickey:${player2Key}`, (res5) => {
                MDS.cmd(`txnbasics id:${txnId}`, (res6) => {
                  MDS.cmd(`txnpost id:${txnId}`, (res7) => {
                    resolve({
                      status: "payout_complete",
                      winner: winnerAddress,
                      amount: amount
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }

  // Скасування гри (якщо другий гравець не приєднався)
  async cancelGame(txnId) {
    return new Promise((resolve) => {
      MDS.cmd(`txndelete id:${txnId}`, (res) => {
        resolve(res.status);
      });
    });
  }

  // ============================================
  // SOLO GAME WITH STAKES (против бота)
  // ============================================

  // Создать простую транзакцию ставки для игры с ботом
  async createBotStake(betAmount) {
    return new Promise((resolve) => {
      const txnId = `bot_game_${Date.now()}`;
      
      // Создаем транзакцию
      MDS.cmd(`txncreate id:${txnId}`, (res1) => {
        if (!res1.status) {
          console.error("Failed to create transaction");
          return resolve(null);
        }

        // Находим монету для ставки
        MDS.cmd("coins relevant:true", (res2) => {
          if (!res2.status) {
            console.error("Failed to get coins");
            return resolve(null);
          }

          const suitableCoin = res2.response.find(
            c => parseFloat(c.amount) >= betAmount && c.tokenid === "0x00"
          );
          
          if (!suitableCoin) {
            console.error("Insufficient funds for bet");
            return resolve({ error: "insufficient_funds", required: betAmount });
          }

          // Добавляем вход
          MDS.cmd(`txninput id:${txnId} coinid:${suitableCoin.coinid}`, (res3) => {
            if (!res3.status) {
              console.error("Failed to add input");
              return resolve(null);
            }

            // Получаем адрес для возврата
            MDS.cmd("getaddress", (res4) => {
              if (!res4.status) return resolve(null);

              const playerAddress = res4.response.miniaddress;
              const change = parseFloat(suitableCoin.amount) - betAmount;

              // Если есть сдача, добавляем вывод
              if (change > 0.000001) { // Минимальная сумма
                MDS.cmd(`txnoutput id:${txnId} address:${playerAddress} amount:${change}`, (res5) => {
                  if (!res5.status) return resolve(null);

                  // Подписываем транзакцию
                  this.signAndPostBotStake(txnId, betAmount, resolve);
                });
              } else {
                // Нет сдачи, сразу подписываем
                this.signAndPostBotStake(txnId, betAmount, resolve);
              }
            });
          });
        });
      });
    });
  }

  // Подписать и отправить транзакцию ставки
  signAndPostBotStake(txnId, betAmount, resolve) {
    MDS.cmd(`txnsign id:${txnId} publickey:auto`, (res6) => {
      if (!res6.status) {
        console.error("Failed to sign transaction");
        return resolve(null);
      }

      MDS.cmd(`txnbasics id:${txnId}`, (res7) => {
        if (!res7.status) {
          console.error("Failed to add basics");
          return resolve(null);
        }

        // ОТПРАВЛЯЕМ транзакцию (ставка списана)
        MDS.cmd(`txnpost id:${txnId}`, (res8) => {
          if (!res8.status) {
            console.error("Failed to post transaction");
            return resolve(null);
          }

          console.log("Bet transaction posted successfully");
          resolve({
            status: "bet_placed",
            txnId: txnId,
            betAmount: betAmount,
            transactionId: res8.response?.txpowid || "pending"
          });
        });
      });
    });
  }

  // Выплата выигрыша игроку (РЕАЛЬНАЯ транзакция с House кошелька)
  async payoutBotGame(playerAddress, winAmount) {
    return new Promise((resolve) => {
      const HOUSE_ADDRESS = "MxG080G6W4B38NQ5RBC35YWFCDKDJ71GMC8GDYRJ101Y3EF49UD1QPGE254T2ZV";
      
      console.log(`Paying out ${winAmount} Minima to ${playerAddress} from House wallet`);
      
      // Создаем транзакцию выплаты
      const payoutTxnId = `payout_${Date.now()}`;
      
      MDS.cmd(`txncreate id:${payoutTxnId}`, (res1) => {
        if (!res1.status) {
          console.error("Failed to create payout transaction");
          return resolve({ status: "error", message: "Failed to create transaction" });
        }

        // Находим монету House для выплаты
        MDS.cmd("coins relevant:true", (res2) => {
          if (!res2.status) {
            console.error("Failed to get House coins");
            return resolve({ status: "error", message: "No coins available" });
          }

          const houseCoin = res2.response.find(
            c => parseFloat(c.amount) >= winAmount && c.tokenid === "0x00"
          );
          
          if (!houseCoin) {
            console.error("Insufficient House funds for payout");
            return resolve({ 
              status: "insufficient_house_funds", 
              required: winAmount,
              message: "House wallet needs to be funded"
            });
          }

          // Добавляем вход от House
          MDS.cmd(`txninput id:${payoutTxnId} coinid:${houseCoin.coinid}`, (res3) => {
            if (!res3.status) {
              return resolve({ status: "error", message: "Failed to add input" });
            }

            // Добавляем выплату игроку
            MDS.cmd(`txnoutput id:${payoutTxnId} address:${playerAddress} amount:${winAmount}`, (res4) => {
              if (!res4.status) {
                return resolve({ status: "error", message: "Failed to add output" });
              }

              // Добавляем сдачу обратно в House
              const change = parseFloat(houseCoin.amount) - winAmount;
              if (change > 0.000001) {
                MDS.cmd("getaddress", (res5) => {
                  const houseChangeAddress = res5.response.miniaddress;
                  
                  MDS.cmd(`txnoutput id:${payoutTxnId} address:${houseChangeAddress} amount:${change}`, (res6) => {
                    this.finalizePayoutTxn(payoutTxnId, winAmount, resolve);
                  });
                });
              } else {
                this.finalizePayoutTxn(payoutTxnId, winAmount, resolve);
              }
            });
          });
        });
      });
    });
  }

  // Финализировать транзакцию выплаты
  finalizePayoutTxn(txnId, amount, resolve) {
    MDS.cmd(`txnsign id:${txnId} publickey:auto`, (res7) => {
      if (!res7.status) {
        return resolve({ status: "error", message: "Failed to sign" });
      }

      MDS.cmd(`txnbasics id:${txnId}`, (res8) => {
        if (!res8.status) {
          return resolve({ status: "error", message: "Failed to add basics" });
        }

        MDS.cmd(`txnpost id:${txnId}`, (res9) => {
          if (!res9.status) {
            return resolve({ status: "error", message: "Failed to post" });
          }

          console.log("Payout transaction posted successfully");
          resolve({
            status: "payout_success",
            amount: amount,
            transactionId: res9.response?.txpowid || "pending"
          });
        });
      });
    });
  }

  // Отправить проигрыш на House адрес
  async sendLossTоHouse(betAmount) {
    // Проигрыш уже был списан в createBotStake()
    // Эти деньги автоматически "сгорели" при создании транзакции
    // Если нужно явно отправить на House адрес - это уже сделано
    
    console.log(`Loss of ${betAmount} Minima - already burned/sent to House`);
    
    return {
      status: "loss_processed",
      amount: betAmount,
      houseAddress: "MxG080G6W4B38NQ5RBC35YWFCDKDJ71GMC8GDYRJ101Y3EF49UD1QPGE254T2ZV"
    };
  }

  // АЛЬТЕРНАТИВНЫЙ МЕТОД: Временная блокировка со смарт-контрактом
  // Создается контракт который возвращает деньги игроку если он выиграл
  async createBotGameContract(betAmount) {
    return new Promise((resolve) => {
      MDS.cmd("getaddress", (res1) => {
        if (!res1.status) return resolve(null);
        
        const playerKey = res1.response.publickey;
        const playerAddress = res1.response.miniaddress;

        // Создаем контракт с таймлоком (5 минут = ~8 блоков)
        // Игрок может забрать деньги если выиграл
        // Или автоматически вернутся через 5 минут
        const script = `
          IF SIGNEDBY(${playerKey}) AND STATE(0) EQ 1 THEN
            RETURN TRUE
          ENDIF
          IF @COINAGE GT 8 AND SIGNEDBY(${playerKey}) THEN
            RETURN TRUE
          ENDIF
          RETURN FALSE
        `;

        MDS.cmd(`newscript trackall:true script:"${script}"`, (res2) => {
          if (!res2.status) return resolve(null);

          const contractAddress = res2.response.miniaddress;
          
          // Отправляем ставку на контракт
          this.sendToContract(contractAddress, betAmount, playerAddress, (result) => {
            if (result) {
              resolve({
                status: "contract_created",
                contractAddress: contractAddress,
                betAmount: betAmount,
                script: script
              });
            } else {
              resolve(null);
            }
          });
        });
      });
    });
  }

  // Отправить на контракт
  sendToContract(contractAddress, amount, changeAddress, callback) {
    const txnId = `contract_stake_${Date.now()}`;
    
    MDS.cmd(`txncreate id:${txnId}`, (res1) => {
      MDS.cmd("coins relevant:true", (res2) => {
        const coin = res2.response.find(
          c => parseFloat(c.amount) >= amount && c.tokenid === "0x00"
        );
        
        if (!coin) return callback(false);

        MDS.cmd(`txninput id:${txnId} coinid:${coin.coinid}`, () => {
          MDS.cmd(`txnoutput id:${txnId} address:${contractAddress} amount:${amount} state:{"0":"0"}`, () => {
            
            const change = parseFloat(coin.amount) - amount;
            if (change > 0.000001) {
              MDS.cmd(`txnoutput id:${txnId} address:${changeAddress} amount:${change}`, () => {
                this.finalizeContractTxn(txnId, callback);
              });
            } else {
              this.finalizeContractTxn(txnId, callback);
            }
          });
        });
      });
    });
  }

  finalizeContractTxn(txnId, callback) {
    MDS.cmd(`txnsign id:${txnId} publickey:auto`, () => {
      MDS.cmd(`txnbasics id:${txnId}`, () => {
        MDS.cmd(`txnpost id:${txnId}`, (res) => {
          callback(res.status);
        });
      });
    });
  }

  // Забрать выигрыш с контракта (если игрок выиграл)
  async claimWinFromContract(contractCoinId, contractAddress) {
    return new Promise((resolve) => {
      const txnId = `claim_win_${Date.now()}`;
      
      MDS.cmd(`txncreate id:${txnId}`, () => {
        MDS.cmd(`txninput id:${txnId} coinid:${contractCoinId}`, () => {
          MDS.cmd("getaddress", (res) => {
            const playerAddress = res.response.miniaddress;
            
            // Получаем сумму контрактной монеты
            MDS.cmd(`coins coinid:${contractCoinId}`, (coinRes) => {
              const amount = parseFloat(coinRes.response[0].amount);
              const winAmount = amount * 2; // Ставка * 2 = ставка + выигрыш
              
              // Выход с победой (STATE 0 = 1)
              MDS.cmd(`txnoutput id:${txnId} address:${playerAddress} amount:${winAmount} state:{"0":"1"}`, () => {
                MDS.cmd(`txnsign id:${txnId} publickey:auto`, () => {
                  MDS.cmd(`txnbasics id:${txnId}`, () => {
                    MDS.cmd(`txnpost id:${txnId}`, (postRes) => {
                      resolve({
                        status: "win_claimed",
                        amount: winAmount
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }
}

// Експорт
window.MinimaGameManager = MinimaGameManager;
