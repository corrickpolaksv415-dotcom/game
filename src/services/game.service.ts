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
export type ImpactType = 'physical' | 'magical' | 'heal' | 'shield' | 'none';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  // Game State Signals
  viewState = signal<'login' | 'dashboard' | 'battle' | 'result'>('login');
  selectedLevel = signal<number>(1);
  battleResult = signal<'win' | 'lose' | null>(null);
  
  // Battle State
  enemy = signal<Enemy | null>(null);
  playerHp = signal<number>(100);
  playerMaxHp = signal<number>(100);
  playerShield = signal<number>(0);
  hand = signal<Card[]>([]);
  deck = signal<Card[]>([]);
  turnLog = signal<string[]>([]);

  // Animation State
  animationState = signal<AnimationState>('idle');
  activeCard = signal<Card | null>(null); // The card currently being played (zoomed in)
  impactType = signal<ImpactType>('none');
  impactValue = signal<number | string>(0); // Number to show during impact

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

    // Wait for "Cast/Focus" animation (Zoom in)
    await this.delay(800);

    // 2. Calculate Logic
    this.resolveCardEffect(card);

    // 3. Trigger Impact Visuals
    this.animationState.set('player_impact');
    
    // Wait for "Impact" animation
    await this.delay(600);

    // 4. Cleanup & Check Win
    this.activeCard.set(null);
    this.animationState.set('idle');

    if ((this.enemy()?.hp || 0) <= 0) {
      await this.delay(500);
      this.endBattle('win');
      return;
    }

    // 5. Enemy Turn (with delay)
    await this.delay(500);
    this.enemyAttackSequence();
  }

  private resolveCardEffect(card: Card) {
    const enemy = this.enemy();
    if (!enemy) return;

    let baseVal = 0;
    const s = enemy.subject;
    if (['数学', '物理', '化学'].includes(s)) baseVal = card.attributes.thinking;
    else if (['语文', '英语', '政治'].includes(s)) baseVal = card.attributes.insight;
    else baseVal = card.attributes.imagination;

    const isSubjectMatch = card.subject === enemy.subject;
    const matchMult = isSubjectMatch ? 1.5 : 1.0;
    const rng = 0.9 + Math.random() * 0.2; 
    const effectivePower = baseVal * matchMult * rng;

    let damage = 0;
    let logMsg = '';

    switch (card.skill.type) {
      case 'heal':
        const healAmt = Math.floor(effectivePower * card.skill.power);
        this.healPlayer(healAmt);
        damage = Math.floor(effectivePower * 0.5);
        this.impactType.set('heal');
        this.impactValue.set(`+${healAmt} HP`);
        logMsg = `[${card.name}] 技能恢复 ${healAmt} HP，造成 ${damage} 伤害！`;
        break;

      case 'shield':
        const shieldAmt = Math.floor(effectivePower * card.skill.power);
        this.addShield(shieldAmt);
        damage = Math.floor(effectivePower * 0.8);
        this.impactType.set('shield');
        this.impactValue.set(`+${shieldAmt} 盾`);
        logMsg = `[${card.name}] 技能获得 ${shieldAmt} 护盾，造成 ${damage} 伤害！`;
        break;

      case 'draw':
        damage = Math.floor(effectivePower * 0.8);
        this.drawCards(card.skill.power);
        this.impactType.set('magical');
        this.impactValue.set(`${damage}`);
        logMsg = `[${card.name}] 抽卡并造成 ${damage} 伤害！`;
        break;

      case 'risky':
        damage = Math.floor(effectivePower * card.skill.power);
        const selfDmg = Math.floor(this.playerHp() * 0.1);
        this.playerHp.update(h => Math.max(1, h - selfDmg));
        this.impactType.set('physical');
        this.impactValue.set(`${damage}!!`);
        logMsg = `[${card.name}] 舍身造成 ${damage} 暴击！`;
        break;

      case 'damage':
      default:
        damage = Math.floor(effectivePower * (card.skill.power || 1));
        this.impactType.set(isSubjectMatch ? 'magical' : 'physical');
        this.impactValue.set(damage);
        logMsg = `[${card.name}] 造成 ${damage} ${isSubjectMatch ? '(完美克制!) ' : ''}伤害！`;
        break;
    }

    const newEnemyHp = Math.max(0, enemy.hp - damage);
    this.enemy.update(e => e ? ({ ...e, hp: newEnemyHp }) : null);
    this.log(logMsg);
  }

  private async enemyAttackSequence() {
    const enemy = this.enemy();
    if (!enemy) return;

    // 1. Enemy Cast Animation
    this.animationState.set('enemy_cast');
    await this.delay(600);

    // 2. Calculate Damage
    let dmg = Math.floor(enemy.atk * (0.8 + Math.random() * 0.4));
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

    // 3. Enemy Impact Animation
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
      // End turn, draw a card
      this.drawCards(1);
    }
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
    if (result === 'win' && !this.enemy()?.isRandom) {
      const currentLevel = this.selectedLevel();
      const rewardCard = Math.random() > 0.5 ? this.generateRewardCard() : [];
      this.storage.saveProgress(currentLevel + 1, rewardCard);
    }
  }

  private generateRewardCard(): Card[] {
    const subjects = ['语文', '数学', '英语', '生物', '地理', '历史', '政治', '物理', '化学'] as const;
    const sub = subjects[Math.floor(Math.random() * subjects.length)];
    const types = ['damage', 'heal', 'shield', 'draw', 'risky'] as const;
    const skillType = types[Math.floor(Math.random() * types.length)];
    let skillName = '普通一击';
    let power = 1;
    let desc = '普通的效果。';
    if (skillType === 'heal') { skillName = '考前补觉'; power = 1.2; desc = '恢复生命值。'; }
    if (skillType === 'shield') { skillName = '硬背公式'; power = 1.5; desc = '获得护盾。'; }
    if (skillType === 'risky') { skillName = '刷夜复习'; power = 2.0; desc = '高伤自损。'; }
    if (skillType === 'draw') { skillName = '灵光一现'; power = 1; desc = '抽卡。'; }
    if (skillType === 'damage') { skillName = '题海战术'; power = 1.2; desc = '稳定输出。'; }
    return [{
      id: Date.now().toString(),
      name: `学霸·${sub}大神`,
      subject: sub,
      rarity: 'R',
      attributes: {
        thinking: 40 + Math.floor(Math.random() * 50),
        insight: 40 + Math.floor(Math.random() * 50),
        imagination: 40 + Math.floor(Math.random() * 50)
      },
      skill: { name: skillName, type: skillType, power, description: desc },
      description: `一位在${sub}领域颇有建树的朋友。`
    }];
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
