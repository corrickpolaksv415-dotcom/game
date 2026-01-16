import { Injectable, signal, computed } from '@angular/core';
import { StorageService, Card } from './storage.service';

export interface Enemy {
  name: string;
  subject: string;
  hp: number;
  maxHp: number;
  atk: number;
  description: string;
  isRandom?: boolean;
}

export type AnimationState = 'idle' | 'player_cast' | 'player_impact' | 'enemy_cast' | 'enemy_impact';
export type ImpactType = 'physical' | 'magical' | 'heal' | 'shield' | 'none' | 'buff' | 'debuff';

export interface StatusEffect {
  id: string;
  name: string; // e.g. "Power Up", "Weak"
  type: 'buff' | 'debuff';
  icon: string; // Emoji
  duration: number; // Turns left
  effectId: 'burn' | 'power' | 'weak' | 'fragile'; 
  value: number; // Strength (e.g. 0.5 for 50%)
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  // Game State Signals
  viewState = signal<'login' | 'dashboard' | 'battle' | 'result'>('login');
  selectedLevel = signal<number>(1);
  battleResult = signal<'win' | 'lose' | null>(null);
  expLogs = signal<string[]>([]); // To show level ups at end
  
  // Battle State
  enemy = signal<Enemy | null>(null);
  playerHp = signal<number>(100);
  playerMaxHp = signal<number>(100);
  playerShield = signal<number>(0);
  playerEffects = signal<StatusEffect[]>([]);
  enemyEffects = signal<StatusEffect[]>([]);

  hand = signal<Card[]>([]);
  deck = signal<Card[]>([]);
  turnLog = signal<string[]>([]);

  // Animation State
  animationState = signal<AnimationState>('idle');
  activeCard = signal<Card | null>(null); 
  impactType = signal<ImpactType>('none');
  impactValue = signal<number | string>(0); 

  constructor(private storage: StorageService) {
    if (this.storage.getCurrentUser()) {
      this.viewState.set('dashboard');
    }
  }

  startFixedLevel(level: number) {
    this.selectedLevel.set(level);
    const difficultyMult = 1 + (level * 0.12);
    const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理'];
    const subject = subjects[(level - 1) % 9];

    this.initBattle({
      name: `第 ${level} 关 - ${subject}测试`,
      subject: subject,
      hp: Math.floor(60 * difficultyMult),
      maxHp: Math.floor(60 * difficultyMult),
      atk: Math.floor(8 * difficultyMult),
      description: `这是通往学霸之路的第 ${level} 道难关。`,
      isRandom: false
    });
  }

  startRandomLevel(enemyData: any) {
    this.selectedLevel.set(999);
    this.initBattle({
      name: enemyData.name,
      subject: enemyData.subject,
      hp: enemyData.hp,
      maxHp: enemyData.hp,
      atk: enemyData.atk,
      description: enemyData.description,
      isRandom: true
    });
  }

  private initBattle(enemy: Enemy) {
    this.enemy.set(enemy);
    this.playerMaxHp.set(200 + (this.storage.getCurrentUser()?.cards.length || 0) * 15);
    this.playerHp.set(this.playerMaxHp());
    this.playerShield.set(0);
    this.playerEffects.set([]);
    this.enemyEffects.set([]);
    this.deck.set([...(this.storage.getCurrentUser()?.cards || [])]);
    this.hand.set([]);
    this.turnLog.set(['战斗开始！请选择卡牌进行答题。']);
    this.animationState.set('idle');
    this.activeCard.set(null);
    this.drawCards(4);
    this.viewState.set('battle');
  }

  drawCards(count: number) {
    const currentDeck = this.deck();
    const currentHand = this.hand();
    const newHand = [...currentHand];
    for (let i = 0; i < count; i++) {
      if (newHand.length >= 8) break;
      let cardToDraw: Card;
      if (currentDeck.length > 0) {
        const randomIndex = Math.floor(Math.random() * currentDeck.length);
        cardToDraw = currentDeck[randomIndex];
      } else {
        const userCards = this.storage.getCurrentUser()?.cards || [];
        cardToDraw = userCards[Math.floor(Math.random() * userCards.length)];
      }
      newHand.push(cardToDraw);
    }
    this.hand.set(newHand);
  }

  // Async sequence for playing a card
  async playCard(cardIndex: number) {
    if (this.animationState() !== 'idle' || !this.enemy() || this.playerHp() <= 0) return;

    const hand = this.hand();
    const card = hand[cardIndex];
    
    // 1. Setup Casting State
    const newHand = [...hand];
    newHand.splice(cardIndex, 1);
    this.hand.set(newHand);
    
    this.activeCard.set(card);
    this.animationState.set('player_cast');

    await this.delay(800);

    // 2. Resolve Effect
    this.resolveCardEffect(card);

    this.animationState.set('player_impact');
    await this.delay(600);

    this.activeCard.set(null);
    this.animationState.set('idle');

    if ((this.enemy()?.hp || 0) <= 0) {
      await this.delay(500);
      this.endBattle('win');
      return;
    }

    // 3. Enemy Turn
    await this.delay(500);
    this.enemyAttackSequence();
  }

  private resolveCardEffect(card: Card) {
    const enemy = this.enemy();
    if (!enemy) return;

    // Attributes
    let baseVal = 0;
    const s = enemy.subject;
    if (['数学', '物理', '化学'].includes(s)) baseVal = card.attributes.thinking;
    else if (['语文', '英语', '政治'].includes(s)) baseVal = card.attributes.insight;
    else baseVal = card.attributes.imagination;

    const isSubjectMatch = card.subject === enemy.subject;
    const matchMult = isSubjectMatch ? 1.5 : 1.0;
    const rng = 0.9 + Math.random() * 0.2; 
    
    // Check Player Buffs for Damage
    let damageMult = 1.0;
    if (this.hasEffect(this.playerEffects(), 'power')) damageMult *= 1.5;
    if (this.hasEffect(this.playerEffects(), 'weak')) damageMult *= 0.5;

    // Check Enemy Debuffs for Damage Taken
    let enemyDefMult = 1.0;
    if (this.hasEffect(this.enemyEffects(), 'fragile')) enemyDefMult *= 1.5;

    const effectivePower = baseVal * matchMult * rng * damageMult;

    let damage = 0;
    let logMsg = '';

    switch (card.skill.type) {
      case 'heal':
        const healAmt = Math.floor(effectivePower * card.skill.power);
        this.healPlayer(healAmt);
        damage = Math.floor(effectivePower * 0.5 * enemyDefMult);
        this.impactType.set('heal');
        this.impactValue.set(`+${healAmt}`);
        logMsg = `[${card.name}] 恢复 ${healAmt} HP，造成 ${damage} 伤害！`;
        break;

      case 'shield':
        const shieldAmt = Math.floor(effectivePower * card.skill.power);
        this.addShield(shieldAmt);
        damage = Math.floor(effectivePower * 0.8 * enemyDefMult);
        this.impactType.set('shield');
        this.impactValue.set(`+${shieldAmt}`);
        logMsg = `[${card.name}] 获得 ${shieldAmt} 护盾，造成 ${damage} 伤害！`;
        break;

      case 'draw':
        damage = Math.floor(effectivePower * 0.8 * enemyDefMult);
        this.drawCards(card.skill.power);
        this.impactType.set('magical');
        this.impactValue.set(`${damage}`);
        logMsg = `[${card.name}] 抽卡并造成 ${damage} 伤害！`;
        break;

      case 'risky':
        damage = Math.floor(effectivePower * card.skill.power * enemyDefMult);
        const selfDmg = Math.floor(this.playerHp() * 0.1);
        this.playerHp.update(h => Math.max(1, h - selfDmg));
        this.impactType.set('physical');
        this.impactValue.set(`${damage}!!`);
        logMsg = `[${card.name}] 舍身一击造成 ${damage} 暴击！`;
        break;

      case 'buff':
        // Power Up Logic
        this.addEffect(this.playerEffects, {
          id: Date.now().toString(),
          name: '强化', type: 'buff', icon: '💪', duration: 3, effectId: 'power', value: 0.5
        });
        damage = Math.floor(effectivePower * 0.5 * enemyDefMult);
        this.impactType.set('buff');
        this.impactValue.set('ATK UP');
        logMsg = `[${card.name}] 激励全队攻击提升，并造成 ${damage} 伤害！`;
        break;

      case 'debuff':
        // Weak Logic on Enemy
        this.addEffect(this.enemyEffects, {
          id: Date.now().toString(),
          name: '虚弱', type: 'debuff', icon: '📉', duration: 3, effectId: 'weak', value: 0.5
        });
        damage = Math.floor(effectivePower * 0.5 * enemyDefMult);
        this.impactType.set('debuff');
        this.impactValue.set('WEAK');
        logMsg = `[${card.name}] 干扰敌人使其虚弱，并造成 ${damage} 伤害！`;
        break;

      case 'damage':
      default:
        damage = Math.floor(effectivePower * (card.skill.power || 1) * enemyDefMult);
        this.impactType.set(isSubjectMatch ? 'magical' : 'physical');
        this.impactValue.set(damage);
        logMsg = `[${card.name}] 造成 ${damage} ${isSubjectMatch ? '(克制!) ' : ''}伤害！`;
        break;
    }

    const newEnemyHp = Math.max(0, enemy.hp - damage);
    this.enemy.update(e => e ? ({ ...e, hp: newEnemyHp }) : null);
    this.log(logMsg);
  }

  private async enemyAttackSequence() {
    // 1. Process Status Effects (Tick Down / DoT)
    await this.processTurnEffects();

    if (this.playerHp() <= 0) {
      await this.delay(500);
      this.endBattle('lose');
      return;
    }

    const enemy = this.enemy();
    if (!enemy || enemy.hp <= 0) return; // Enemy might die from DoT

    this.animationState.set('enemy_cast');
    await this.delay(600);

    // Enemy Calc
    let enemyAtk = enemy.atk * (0.8 + Math.random() * 0.4);
    
    // Modifiers
    if (this.hasEffect(this.enemyEffects(), 'weak')) enemyAtk *= 0.5;
    if (this.hasEffect(this.enemyEffects(), 'power')) enemyAtk *= 1.5;
    if (this.hasEffect(this.playerEffects(), 'fragile')) enemyAtk *= 1.5;

    let dmg = Math.floor(enemyAtk);

    // Boss Random Debuff Chance (20%)
    if (Math.random() < 0.2) {
      const debuffType = Math.random() > 0.5 ? 'burn' : 'fragile';
      const name = debuffType === 'burn' ? '点燃' : '易伤';
      const icon = debuffType === 'burn' ? '🔥' : '💔';
      
      this.addEffect(this.playerEffects, {
        id: Date.now().toString(), name, type: 'debuff', icon, duration: 3, effectId: debuffType as any, value: 0
      });
      this.log(`${enemy.name} 施加了 [${name}] 效果！`);
    }

    // Shield Logic
    const currentShield = this.playerShield();
    let blocked = false;
    if (currentShield > 0) {
      if (currentShield >= dmg) {
        this.playerShield.set(currentShield - dmg);
        dmg = 0;
        blocked = true;
        this.log(`${enemy.name} 的攻击被护盾完全抵挡！`);
      } else {
        dmg -= currentShield;
        this.playerShield.set(0);
        this.log(`${enemy.name} 击碎了护盾！`);
      }
    }

    this.animationState.set('enemy_impact');
    this.impactType.set(blocked ? 'shield' : 'physical');
    this.impactValue.set(blocked ? '格挡' : `-${dmg}`);

    if (dmg > 0) {
      const newHp = Math.max(0, this.playerHp() - dmg);
      this.playerHp.set(newHp);
      this.log(`${enemy.name} 造成了 ${dmg} 点伤害！`);
    }

    await this.delay(600);
    this.animationState.set('idle');

    if (this.playerHp() <= 0) {
      await this.delay(500);
      this.endBattle('lose');
    } else {
      this.drawCards(1);
    }
  }

  private async processTurnEffects() {
    // Process Player Effects
    const pEffects = this.playerEffects();
    let pLog = '';
    
    // DoT check
    const burns = pEffects.filter(e => e.effectId === 'burn');
    if (burns.length > 0) {
      const burnDmg = Math.floor(this.playerMaxHp() * 0.05) * burns.length;
      this.playerHp.update(h => Math.max(0, h - burnDmg));
      pLog = `受到点燃伤害 -${burnDmg} `;
      this.impactType.set('debuff');
      this.impactValue.set(`🔥${burnDmg}`);
      this.animationState.set('player_impact'); // Visual feedback
      await this.delay(500);
      this.animationState.set('idle');
    }

    // Decrement Duration
    const nextPEffects = pEffects
      .map(e => ({...e, duration: e.duration - 1}))
      .filter(e => e.duration > 0);
    this.playerEffects.set(nextPEffects);

    // Enemy Effects
    const nextEEffects = this.enemyEffects()
      .map(e => ({...e, duration: e.duration - 1}))
      .filter(e => e.duration > 0);
    this.enemyEffects.set(nextEEffects);

    if (pLog) this.log(pLog);
  }

  // --- Helpers ---
  private addEffect(signalRef: any, effect: StatusEffect) {
    signalRef.update((current: StatusEffect[]) => {
      // Refresh duration if exists, else add
      const idx = current.findIndex(e => e.effectId === effect.effectId);
      if (idx >= 0) {
        const updated = [...current];
        updated[idx] = effect; 
        return updated;
      }
      return [...current, effect];
    });
  }

  private hasEffect(list: StatusEffect[], id: string): boolean {
    return list.some(e => e.effectId === id);
  }

  private healPlayer(amount: number) {
    const current = this.playerHp();
    const max = this.playerMaxHp();
    this.playerHp.set(Math.min(max, current + amount));
  }

  private addShield(amount: number) {
    this.playerShield.update(s => s + amount);
  }

  private endBattle(result: 'win' | 'lose') {
    this.battleResult.set(result);
    this.viewState.set('result');
    this.expLogs.set([]);

    if (result === 'win') {
      const currentLevel = this.selectedLevel();
      // 1. Progress Level
      if (!this.enemy()?.isRandom) {
         const rewardCard = Math.random() > 0.6 ? this.generateRewardCard() : [];
         this.storage.saveProgress(currentLevel + 1, rewardCard);
      }
      
      // 2. Cultivation: Add EXP to Deck
      // Exp Formula: 20 * Level Difficulty
      const expGain = Math.floor(20 * (1 + (this.enemy()?.isRandom ? 5 : currentLevel) * 0.2));
      const deckIds = this.deck().map(c => c.id);
      const logs = this.storage.addExpToCards(deckIds, expGain);
      this.expLogs.set([`全员获得 ${expGain} 经验值`, ...logs]);
    }
  }

  private generateRewardCard(): Card[] {
    const subjects = ['语文', '数学', '英语', '生物', '地理', '历史', '政治', '物理', '化学'] as const;
    const sub = subjects[Math.floor(Math.random() * subjects.length)];
    const types = ['damage', 'heal', 'shield', 'draw', 'risky', 'buff', 'debuff'] as const;
    const skillType = types[Math.floor(Math.random() * types.length)];
    
    let skillName = '普通一击';
    let power = 1;
    let desc = '普通的效果。';

    if (skillType === 'heal') { skillName = '考前补觉'; power = 1.2; desc = '恢复生命值。'; }
    if (skillType === 'shield') { skillName = '硬背公式'; power = 1.5; desc = '获得护盾。'; }
    if (skillType === 'risky') { skillName = '刷夜复习'; power = 2.0; desc = '高伤自损。'; }
    if (skillType === 'draw') { skillName = '灵光一现'; power = 1; desc = '抽卡。'; }
    if (skillType === 'damage') { skillName = '题海战术'; power = 1.2; desc = '稳定输出。'; }
    if (skillType === 'buff') { skillName = '加油打气'; power = 0.5; desc = '全队攻击强化。'; }
    if (skillType === 'debuff') { skillName = '难题干扰'; power = 0.5; desc = '使敌人虚弱。'; }

    const newCard: Card = {
      id: Date.now().toString(),
      name: `学霸·${sub}大神`,
      subject: sub,
      rarity: 'R',
      level: 1, exp: 0, maxExp: 100,
      baseAttributes: {
        thinking: 40 + Math.floor(Math.random() * 50),
        insight: 40 + Math.floor(Math.random() * 50),
        imagination: 40 + Math.floor(Math.random() * 50)
      },
      attributes: { // Initial attributes same as base
         thinking: 0, insight: 0, imagination: 0
      },
      skill: {
        name: skillName,
        type: skillType,
        power: power,
        description: desc
      },
      description: `一位在${sub}领域颇有建树的朋友。`
    };

    newCard.attributes = { ...newCard.baseAttributes };
    return [newCard];
  }

  private log(msg: string) {
    this.turnLog.update(l => [...l, msg]);
    if (this.turnLog().length > 6) this.turnLog.update(l => l.slice(1));
  }

  resetToDashboard() {
    this.viewState.set('dashboard');
    this.battleResult.set(null);
    this.enemy.set(null);
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}