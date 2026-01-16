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
  hand = signal<Card[]>([]);
  deck = signal<Card[]>([]);
  turnLog = signal<string[]>([]);

  constructor(private storage: StorageService) {
    if (this.storage.getCurrentUser()) {
      this.viewState.set('dashboard');
    }
  }

  startFixedLevel(level: number) {
    this.selectedLevel.set(level);
    const difficultyMult = 1 + (level * 0.1);
    
    // Cyclic subjects based on level
    const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理'];
    const subject = subjects[(level - 1) % 9];

    this.initBattle({
      name: `第 ${level} 关 - ${subject}测试`,
      subject: subject,
      hp: Math.floor(50 * difficultyMult),
      maxHp: Math.floor(50 * difficultyMult),
      atk: Math.floor(5 * difficultyMult),
      description: `这是通往学霸之路的第 ${level} 道难关。`,
      isRandom: false
    });
  }

  startRandomLevel(enemyData: any) {
    this.selectedLevel.set(999); // Special ID for random
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
    this.playerMaxHp.set(200 + (this.storage.getCurrentUser()?.cards.length || 0) * 10);
    this.playerHp.set(this.playerMaxHp());
    this.deck.set([...(this.storage.getCurrentUser()?.cards || [])]);
    this.hand.set([]);
    this.turnLog.set(['战斗开始！请选择卡牌进行答题（攻击）。']);
    this.drawCards(3);
    this.viewState.set('battle');
  }

  drawCards(count: number) {
    const currentDeck = this.deck();
    const currentHand = this.hand();
    
    // Simple shuffle draw simulation
    const newHand = [...currentHand];
    for (let i = 0; i < count; i++) {
      if (currentDeck.length > 0) {
        const randomIndex = Math.floor(Math.random() * currentDeck.length);
        newHand.push(currentDeck[randomIndex]);
        // Note: In this simple version, we don't remove from deck to allow infinite play, 
        // or we reshuffle discard. Let's just keep deck infinite for simplicity of infinite levels.
      } else {
        // Reshuffle from user collection if deck empty
         this.deck.set([...(this.storage.getCurrentUser()?.cards || [])]);
      }
    }
    this.hand.set(newHand);
  }

  playCard(cardIndex: number) {
    const enemy = this.enemy();
    if (!enemy || this.playerHp() <= 0) return;

    const hand = this.hand();
    const card = hand[cardIndex];
    
    // Remove card from hand
    const newHand = [...hand];
    newHand.splice(cardIndex, 1);
    this.hand.set(newHand);

    // Calculate Damage
    let damage = 0;
    let crit = false;
    
    // Subject Match Bonus (2x)
    const isSubjectMatch = card.subject === enemy.subject;
    const subjectMultiplier = isSubjectMatch ? 2 : 1;

    // Attribute Logic
    // Math/Physics/Chem -> Thinking
    // Chinese/English/Politics -> Insight
    // Bio/Geo/History -> Imagination
    // (Simplified mapping for gameplay)
    let basePower = 0;
    if (['数学', '物理', '化学'].includes(enemy.subject)) basePower = card.attributes.thinking;
    else if (['语文', '英语', '政治'].includes(enemy.subject)) basePower = card.attributes.insight;
    else basePower = card.attributes.imagination;

    damage = Math.floor(basePower * subjectMultiplier * (0.9 + Math.random() * 0.2)); // +/- 10% RNG

    // Apply Damage
    const newEnemyHp = Math.max(0, enemy.hp - damage);
    this.enemy.update(e => e ? ({ ...e, hp: newEnemyHp }) : null);

    this.log(`你使用了 [${card.name}]，造成了 ${damage} 点${isSubjectMatch ? ' (完美对口!) ' : ' '}伤害！`);

    // Check Win
    if (newEnemyHp <= 0) {
      this.endBattle('win');
      return;
    }

    // Enemy Turn
    setTimeout(() => {
      this.enemyAttack();
      // Draw 1 card for next turn
      this.drawCards(1);
    }, 1000);
  }

  private enemyAttack() {
    const enemy = this.enemy();
    if (!enemy) return;

    const dmg = Math.floor(enemy.atk * (0.8 + Math.random() * 0.4));
    const newHp = Math.max(0, this.playerHp() - dmg);
    this.playerHp.set(newHp);
    
    this.log(`${enemy.name} 发动了难题攻击，你的精神力减少了 ${dmg}！`);

    if (newHp <= 0) {
      this.endBattle('lose');
    }
  }

  private endBattle(result: 'win' | 'lose') {
    this.battleResult.set(result);
    this.viewState.set('result');
    
    if (result === 'win' && !this.enemy()?.isRandom) {
      // Save Progress
      const currentLevel = this.selectedLevel();
      // Chance to get new card
      const rewardCard = Math.random() > 0.5 ? this.generateRewardCard() : [];
      this.storage.saveProgress(currentLevel + 1, rewardCard);
    }
  }

  private generateRewardCard(): Card[] {
    // Generate a random simple card
    const subjects = ['语文', '数学', '英语', '生物', '地理', '历史', '政治', '物理', '化学'] as const;
    const sub = subjects[Math.floor(Math.random() * subjects.length)];
    return [{
      id: Date.now().toString(),
      name: `转校生·${sub}大神`,
      subject: sub,
      rarity: 'R',
      attributes: {
        thinking: 50 + Math.floor(Math.random() * 30),
        insight: 50 + Math.floor(Math.random() * 30),
        imagination: 50 + Math.floor(Math.random() * 30)
      },
      description: '一位新来的强力帮手。'
    }];
  }

  private log(msg: string) {
    this.turnLog.update(l => [...l, msg]);
    // Keep log short
    if (this.turnLog().length > 6) {
      this.turnLog.update(l => l.slice(1));
    }
  }

  resetToDashboard() {
    this.viewState.set('dashboard');
    this.battleResult.set(null);
    this.enemy.set(null);
  }
}
