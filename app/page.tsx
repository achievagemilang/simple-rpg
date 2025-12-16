/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // --- 1. CONFIGURATION ---
    const GameConfig = {
      STORAGE_KEY: 'rpg_v1',
      ENEMIES: [
        { name: 'Goblin', emoji: '👹', baseHp: 80, baseDmg: 8, xp: 40 },
        { name: 'Skeleton', emoji: '💀', baseHp: 110, baseDmg: 12, xp: 60 },
        { name: 'Orc', emoji: '👺', baseHp: 150, baseDmg: 15, xp: 90 },
        {
          name: 'Dark Wizard',
          emoji: '🧙‍♂️',
          baseHp: 200,
          baseDmg: 25,
          xp: 150,
        },
        { name: 'Dragon', emoji: '🐉', baseHp: 350, baseDmg: 35, xp: 300 },
      ],
      INITIAL_PLAYER: {
        lvl: 1,
        xp: 0,
        xpReq: 100,
        currentHp: 100,
        maxHp: 100,
        currentMp: 50,
        maxMp: 50,
        dmgMin: 12,
        dmgMax: 20,
      },
    } as const;

    // --- 2. DOMAIN LAYER (Business Logic) ---
    class BattleMath {
      static rng(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }

      static calculatePlayerDamage(
        player: {
          dmgMin: number;
          dmgMax: number;
        },
        multiplier = 1
      ) {
        const base = this.rng(player.dmgMin, player.dmgMax) * multiplier;
        const isCrit = Math.random() < 0.15;
        const final = isCrit ? Math.floor(base * 1.5) : Math.floor(base);
        return { amount: final, isCrit };
      }

      static calculateEnemyDamage(enemy: { dmgMin: number; dmgMax: number }) {
        return this.rng(enemy.dmgMin, enemy.dmgMax);
      }

      static calculateHeal(player: { lvl: number }) {
        return this.rng(25, 40) + player.lvl * 5;
      }
    }

    type PlayerState = {
      lvl: number;
      xp: number;
      xpReq: number;
      currentHp: number;
      maxHp: number;
      currentMp: number;
      maxMp: number;
      dmgMin: number;
      dmgMax: number;
    };

    type EnemyState = {
      name: string;
      emoji: string;
      lvl: number;
      maxHp: number;
      currentHp: number;
      dmgMin: number;
      dmgMax: number;
      xpReward: number;
    };

    type GameState = {
      player: PlayerState;
      enemy: EnemyState | null;
      isPlayerTurn: boolean;
      isGameOver: boolean;
    };

    class EnemyFactory {
      static create(playerLvl: number): EnemyState {
        let index = Math.min(
          Math.floor((playerLvl - 1) / 2),
          GameConfig.ENEMIES.length - 1
        );
        if (Math.random() > 0.7 && index > 0) index--;

        const template = GameConfig.ENEMIES[index];
        const scaler = 1 + playerLvl * 0.2;

        return {
          name: template.name,
          emoji: template.emoji,
          lvl: playerLvl + Math.floor(Math.random() * 2),
          maxHp: Math.floor(template.baseHp * scaler),
          currentHp: Math.floor(template.baseHp * scaler),
          dmgMin: Math.floor(template.baseDmg * scaler * 0.8),
          dmgMax: Math.floor(template.baseDmg * scaler * 1.2),
          xpReward: Math.floor(template.xp * scaler),
        };
      }
    }

    // --- 3. INFRASTRUCTURE LAYER (Persistence) ---
    class StorageService {
      static save(state: GameState) {
        if (typeof window === 'undefined') return;
        try {
          window.localStorage.setItem(
            GameConfig.STORAGE_KEY,
            JSON.stringify(state)
          );
        } catch {
          // ignore
        }
      }

      static load(): GameState | null {
        if (typeof window === 'undefined') return null;
        try {
          const data = window.localStorage.getItem(GameConfig.STORAGE_KEY);
          return data ? (JSON.parse(data) as GameState) : null;
        } catch {
          return null;
        }
      }
    }

    // --- 4. STATE LAYER (Data Store) ---
    class GameStore {
      state: GameState;

      constructor() {
        this.state = {
          player: { ...GameConfig.INITIAL_PLAYER },
          enemy: null,
          isPlayerTurn: true,
          isGameOver: false,
        };
      }

      initialize() {
        const saved = StorageService.load();
        if (saved) {
          this.state = saved;
          return true;
        }
        return false;
      }

      update(newState: Partial<GameState>) {
        this.state = { ...this.state, ...newState };
        StorageService.save(this.state);
      }

      get() {
        return this.state;
      }
    }

    // --- 5. PRESENTATION LAYER (View) ---
    class UI {
      els: {
        log: HTMLElement | null;
        pLvl: HTMLElement | null;
        pXp: HTMLElement | null;
        pXpReq: HTMLElement | null;
        xpFill: HTMLElement | null;
        pHpBar: HTMLElement | null;
        pHpTxt: HTMLElement | null;
        pMpBar: HTMLElement | null;
        pMpTxt: HTMLElement | null;
        eName: HTMLElement | null;
        eEmoji: HTMLElement | null;
        eLvl: HTMLElement | null;
        eHpBar: HTMLElement | null;
        eHpTxt: HTMLElement | null;
        btnReset: HTMLButtonElement | null;
        btns: NodeListOf<HTMLButtonElement>;
        btnFire: HTMLButtonElement | null;
        btnHeal: HTMLButtonElement | null;
      };

      constructor() {
        this.els = {
          log: document.getElementById('combat-log'),
          pLvl: document.getElementById('player-lvl'),
          pXp: document.getElementById('player-xp'),
          pXpReq: document.getElementById('xp-req'),
          xpFill: document.getElementById('xp-fill'),
          pHpBar: document.getElementById('player-hp-bar'),
          pHpTxt: document.getElementById('player-hp-text'),
          pMpBar: document.getElementById('player-mp-bar'),
          pMpTxt: document.getElementById('player-mp-text'),
          eName: document.getElementById('enemy-name'),
          eEmoji: document.getElementById('enemy-emoji'),
          eLvl: document.getElementById('enemy-lvl'),
          eHpBar: document.getElementById('enemy-hp-bar'),
          eHpTxt: document.getElementById('enemy-hp-text'),
          btnReset: document.getElementById('btn-reset') as HTMLButtonElement,
          btns: document.querySelectorAll(
            '.controls button:not(.btn-reset)'
          ) as NodeListOf<HTMLButtonElement>,
          btnFire: document.getElementById('btn-fire') as HTMLButtonElement,
          btnHeal: document.getElementById('btn-heal') as HTMLButtonElement,
        };
      }

      render(state: GameState) {
        const { player, enemy } = state;

        if (this.els.pLvl) this.els.pLvl.innerText = String(player.lvl);
        if (this.els.pXp) this.els.pXp.innerText = String(player.xp);
        if (this.els.pXpReq) this.els.pXpReq.innerText = String(player.xpReq);
        if (this.els.xpFill) {
          const pct = Math.min(100, (player.xp / player.xpReq) * 100);
          this.els.xpFill.style.width = `${pct}%`;
        }

        if (this.els.pHpBar && this.els.pHpTxt) {
          this.updateBar(
            this.els.pHpBar,
            this.els.pHpTxt,
            player.currentHp,
            player.maxHp,
            true
          );
        }
        if (this.els.pMpBar && this.els.pMpTxt) {
          this.updateBar(
            this.els.pMpBar,
            this.els.pMpTxt,
            player.currentMp,
            player.maxMp,
            false,
            true
          );
        }

        if (enemy) {
          if (this.els.eName) this.els.eName.innerText = enemy.name;
          if (this.els.eEmoji) this.els.eEmoji.innerText = enemy.emoji;
          if (this.els.eLvl) this.els.eLvl.innerText = String(enemy.lvl);
          if (this.els.eHpBar && this.els.eHpTxt) {
            this.updateBar(
              this.els.eHpBar,
              this.els.eHpTxt,
              enemy.currentHp,
              enemy.maxHp,
              true,
              false,
              true
            );
          }
        }

        if (this.els.btnFire) {
          this.els.btnFire.style.opacity = player.currentMp < 25 ? '0.6' : '1';
        }
        if (this.els.btnHeal) {
          this.els.btnHeal.style.opacity = player.currentMp < 15 ? '0.6' : '1';
        }
      }

      log(msg: string, type: string = 'log-sys') {
        if (!this.els.log) return;
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerText = msg;
        this.els.log.appendChild(entry);
        this.els.log.scrollTop = this.els.log.scrollHeight;
      }

      toggleControls(enable: boolean) {
        this.els.btns.forEach((btn) => {
          btn.disabled = !enable;
        });
      }

      showResetButton(won: boolean) {
        if (!this.els.btnReset) return;
        this.els.btnReset.style.display = 'block';
        this.els.btnReset.innerText = won
          ? 'Continue Deeper ➔'
          : 'Resurrect (Restart) 💀';
        this.els.btnReset.style.backgroundColor = won ? '#f1c40f' : '#546e7a';
        this.toggleControls(false);
      }

      hideResetButton() {
        if (!this.els.btnReset) return;
        this.els.btnReset.style.display = 'none';
      }

      shake(elementId: string) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.classList.remove('shake-anim');
        // trigger reflow
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        (el as HTMLElement).offsetWidth;
        el.classList.add('shake-anim');
      }

      floatText(
        amount: number,
        targetId: string,
        type: 'dmg' | 'heal' | 'mp' = 'dmg',
        isCrit = false
      ) {
        const target = document.getElementById(targetId);
        if (!target) return;
        const el = document.createElement('div');
        el.className = 'damage-text';

        let text = `-${amount}`;
        if (type === 'heal') {
          el.classList.add('heal-text');
          text = `+${amount}`;
        }
        if (type === 'mp') {
          el.classList.add('mp-text');
          text = `+${amount} MP`;
        }
        if (isCrit) {
          el.style.fontSize = '2rem';
          text += '!';
        }

        el.innerText = text;
        target.appendChild(el);
        setTimeout(() => el.remove(), 1000);
      }

      private updateBar(
        barEl: HTMLElement,
        txtEl: HTMLElement,
        current: number,
        max: number,
        isHp: boolean,
        isMp = false,
        isEnemy = false
      ) {
        const pct = (current / max) * 100;
        barEl.style.width = `${Math.max(0, pct)}%`;
        txtEl.innerText = `${current}/${max}`;

        if (isHp) {
          if (pct < 30) barEl.style.backgroundColor = '#ff5252';
          else if (isEnemy) barEl.style.backgroundColor = '#e74c3c';
          else barEl.style.backgroundColor = '#2ecc71';
        }
        if (isMp) {
          barEl.style.backgroundColor = '#3498db';
        }
      }
    }

    // --- 6. APPLICATION LAYER (Controller) ---
    class GameController {
      store: GameStore;
      ui: UI;

      constructor() {
        this.store = new GameStore();
        this.ui = new UI();

        const attackBtn = document.getElementById(
          'btn-attack'
        ) as HTMLButtonElement | null;
        const fireBtn = document.getElementById(
          'btn-fire'
        ) as HTMLButtonElement | null;
        const healBtn = document.getElementById(
          'btn-heal'
        ) as HTMLButtonElement | null;
        const resetBtn = document.getElementById(
          'btn-reset'
        ) as HTMLButtonElement | null;

        if (attackBtn) {
          attackBtn.onclick = () => this.handlePlayerAction('attack');
        }
        if (fireBtn) {
          fireBtn.onclick = () => this.handlePlayerAction('fireball');
        }
        if (healBtn) {
          healBtn.onclick = () => this.handlePlayerAction('heal');
        }
        if (resetBtn) {
          resetBtn.onclick = () => this.handleReset();
        }

        this.init();
      }

      init() {
        const loaded = this.store.initialize();

        if (loaded) {
          this.ui.log('--- SESSION RESTORED ---', 'log-sys');
          this.ui.render(this.store.get());

          const state = this.store.get();
          if (state.isGameOver && state.enemy) {
            this.ui.showResetButton(state.enemy.currentHp <= 0);
          } else if (!state.isPlayerTurn) {
            this.ui.toggleControls(false);
            setTimeout(() => this.executeEnemyTurn(), 1000);
          }
        } else {
          this.startNewBattle();
        }
      }

      startNewBattle() {
        const state = this.store.get();
        const newEnemy = EnemyFactory.create(state.player.lvl);

        this.store.update({
          enemy: newEnemy,
          isPlayerTurn: true,
          isGameOver: false,
        });

        this.ui.hideResetButton();
        this.ui.toggleControls(true);
        this.ui.log(
          `A wild ${newEnemy.name} (Lvl ${newEnemy.lvl}) appears!`,
          'log-sys'
        );
        this.ui.render(this.store.get());
      }

      handlePlayerAction(action: 'attack' | 'fireball' | 'heal') {
        const state = this.store.get();
        if (!state.isPlayerTurn || state.isGameOver || !state.enemy) return;

        const player = { ...state.player };
        const enemy = { ...state.enemy };
        let logMsg = '';
        let logType: string = 'log-player';

        if (action === 'attack') {
          const { amount, isCrit } = BattleMath.calculatePlayerDamage(player);
          enemy.currentHp = Math.max(0, enemy.currentHp - amount);

          const mpRegen = 10;
          player.currentMp = Math.min(player.maxMp, player.currentMp + mpRegen);

          this.ui.floatText(amount, 'char-enemy', 'dmg', isCrit);
          this.ui.floatText(mpRegen, 'char-player', 'mp');
          this.ui.shake('char-enemy');
          logMsg = `You hit for ${amount} dmg and recovered ${mpRegen} MP.`;
        } else if (action === 'fireball') {
          if (player.currentMp < 25) {
            this.ui.log('Not enough MP!', 'log-sys');
            this.ui.shake('char-player');
            return;
          }
          player.currentMp -= 25;
          const { amount } = BattleMath.calculatePlayerDamage(player, 2.5);
          enemy.currentHp = Math.max(0, enemy.currentHp - amount);

          this.ui.floatText(amount, 'char-enemy', 'dmg', true);
          this.ui.shake('char-enemy');
          logMsg = `FIREBALL! You scorched ${enemy.name} for ${amount} dmg!`;
          logType = 'log-magic';
        } else if (action === 'heal') {
          if (player.currentMp < 15) {
            this.ui.log('Not enough MP!', 'log-sys');
            this.ui.shake('char-player');
            return;
          }
          player.currentMp -= 15;
          const healAmt = BattleMath.calculateHeal(player);
          const oldHp = player.currentHp;
          player.currentHp = Math.min(player.maxHp, player.currentHp + healAmt);

          this.ui.floatText(player.currentHp - oldHp, 'char-player', 'heal');
          logMsg = `You cast Heal and recovered ${
            player.currentHp - oldHp
          } HP.`;
          logType = 'log-heal';
        }

        this.store.update({ player, enemy });
        this.ui.render(this.store.get());
        this.ui.log(logMsg, logType);

        if (this.checkWinCondition(player, enemy)) return;

        this.store.update({ isPlayerTurn: false });
        this.ui.toggleControls(false);
        setTimeout(() => this.executeEnemyTurn(), 1000);
      }

      executeEnemyTurn() {
        const state = this.store.get();
        if (state.isGameOver || !state.enemy) return;

        const player = { ...state.player };
        const enemy = { ...state.enemy };

        const dmg = BattleMath.calculateEnemyDamage(enemy);
        player.currentHp = Math.max(0, player.currentHp - dmg);

        this.ui.floatText(dmg, 'char-player', 'dmg');
        this.ui.shake('char-player');
        this.ui.log(`${enemy.name} attacked you for ${dmg} dmg!`, 'log-enemy');

        this.store.update({ player, enemy });
        this.ui.render(this.store.get());

        if (!this.checkWinCondition(player, enemy)) {
          this.store.update({ isPlayerTurn: true });
          this.ui.toggleControls(true);
        }
      }

      checkWinCondition(player: PlayerState, enemy: EnemyState) {
        if (enemy.currentHp <= 0) {
          this.handleWin(player, enemy);
          return true;
        }
        if (player.currentHp <= 0) {
          this.handleLoss();
          return true;
        }
        return false;
      }

      handleWin(player: PlayerState, enemy: EnemyState) {
        this.ui.log(`Victory! You defeated the ${enemy.name}.`, 'log-sys');

        player.xp += enemy.xpReward;
        this.ui.log(`You gained ${enemy.xpReward} XP.`, 'log-sys');

        if (player.xp >= player.xpReq) {
          player.lvl++;
          player.xp -= player.xpReq;
          player.xpReq = Math.floor(player.xpReq * 1.4);
          player.maxHp += 20;
          player.currentHp = player.maxHp;
          player.maxMp += 10;
          player.currentMp = player.maxMp;
          player.dmgMin += 3;
          player.dmgMax += 3;
          this.ui.log(`LEVEL UP! You are now Level ${player.lvl}.`, 'log-sys');
          this.ui.shake('char-player');
        }

        this.store.update({ player, isGameOver: true });
        this.ui.render(this.store.get());
        this.ui.showResetButton(true);
      }

      handleLoss() {
        this.ui.log('DEFEAT. The dungeon claims another soul.', 'log-enemy');
        this.store.update({ isGameOver: true });
        this.ui.showResetButton(false);
      }

      handleReset() {
        const state = this.store.get();
        if (state.player.currentHp <= 0) {
          this.store.update({
            player: { ...GameConfig.INITIAL_PLAYER },
            isGameOver: false,
          });
          const logEl = document.getElementById('combat-log');
          if (logEl) logEl.innerHTML = '';
          this.ui.log('--- NEW GAME STARTED ---', 'log-sys');
        } else {
          this.ui.log('--- NEXT BATTLE ---', 'log-sys');
        }
        this.startNewBattle();
      }
    }

    // Start App (only once)
    // eslint-disable-next-line no-new
    new GameController();
  }, []);

  return (
    <div className='game-root'>
      <div className='game-container'>
        <header>
          <div className='level-badge'>
            LVL <span id='player-lvl'>1</span>
          </div>
          <div className='xp-container'>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Experience</span>
              <span>
                <span id='player-xp'>0</span> / <span id='xp-req'>100</span>
              </span>
            </div>
            <div className='xp-bar'>
              <div id='xp-fill' className='xp-fill' />
            </div>
          </div>
        </header>

        <div className='battle-scene'>
          <div className='character' id='char-player'>
            <span className='emoji'>🛡️</span>
            <span className='name-tag'>Hero</span>
            <div className='bar-container'>
              <div id='player-hp-bar' className='bar-fill hp-fill' />
              <div id='player-hp-text' className='bar-text'>
                100/100
              </div>
            </div>
            <div
              className='bar-container'
              style={{ height: '12px', marginTop: '2px' }}
            >
              <div id='player-mp-bar' className='bar-fill mp-fill' />
              <div
                id='player-mp-text'
                className='bar-text'
                style={{ fontSize: '0.65rem', lineHeight: '12px' }}
              >
                50/50
              </div>
            </div>
          </div>

          <div className='character' id='char-enemy'>
            <span className='emoji' id='enemy-emoji'>
              👹
            </span>
            <span className='name-tag' id='enemy-name'>
              Goblin
            </span>
            <span className='lvl-tag'>
              Lvl <span id='enemy-lvl'>1</span>
            </span>
            <div className='bar-container'>
              <div id='enemy-hp-bar' className='bar-fill hp-fill' />
              <div id='enemy-hp-text' className='bar-text'>
                80/80
              </div>
            </div>
          </div>
        </div>

        <div id='combat-log' />

        <div className='controls'>
          <button id='btn-attack' className='btn-attack'>
            <span>⚔️ Attack</span>
            <small>+10 MP</small>
          </button>
          <button id='btn-fire' className='btn-fire'>
            <span>🔥 Fireball</span>
            <small>25 MP</small>
          </button>
          <button id='btn-heal' className='btn-heal'>
            <span>✨ Heal</span>
            <small>15 MP</small>
          </button>
          <button id='btn-reset' className='btn-reset'>
            Next Battle ➔
          </button>
        </div>
      </div>
    </div>
  );
}
