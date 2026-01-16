import { Injectable } from '@angular/core';

export interface Skill {
  name: string;
  type: 'damage' | 'heal' | 'shield' | 'draw' | 'risky' | 'buff' | 'debuff'; 
  power: number; // For buffs: 1 = Power Up, 2 = Defense Up etc. mapped in GameService
  description: string;
}

export interface Card {
  id: string;
  name: string;
  subject: '语文' | '数学' | '英语' | '生物' | '地理' | '历史' | '政治' | '物理' | '化学';
  rarity: 'N' | 'R' | 'SR' | 'SSR';
  level: number;
  exp: number;
  maxExp: number;
  baseAttributes: {
    thinking: number;
    insight: number;
    imagination: number;
  };
  attributes: {
    thinking: number;
    insight: number;
    imagination: number;
  };
  skill: Skill;
  description: string;
}

export interface UserSave {
  uid: string;
  currentLevel: number; // 1-100
  cards: Card[];
  nickname: string;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEY = 'academic_alliance_users';
  private currentUser: UserSave | null = null;

  constructor() {
    this.loadUserFromSession();
  }

  // Simulate Registration
  register(uid: string, pass: string, nickname: string): boolean {
    const db = this.getDb();
    if (db[uid]) return false; // Already exists

    db[uid] = {
      password: pass,
      data: this.createStarterSave(uid, nickname)
    };
    this.saveDb(db);
    return true;
  }

  // Simulate Login
  login(uid: string, pass: string): boolean {
    const db = this.getDb();
    const userRecord = db[uid];
    if (userRecord && userRecord.password === pass) {
      this.currentUser = userRecord.data;
      localStorage.setItem('current_session_uid', uid);
      return true;
    }
    return false;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('current_session_uid');
  }

  getCurrentUser(): UserSave | null {
    return this.currentUser;
  }

  saveProgress(level: number, newCards: Card[] = []) {
    if (!this.currentUser) return;
    
    if (level > this.currentUser.currentLevel) {
      this.currentUser.currentLevel = level;
    }
    this.currentUser.cards = [...this.currentUser.cards, ...newCards];
    this.saveUserToDb();
  }

  // --- Cultivation Logic ---

  addExpToCards(cardIds: string[], amount: number): string[] {
    if (!this.currentUser) return [];
    const logs: string[] = [];

    this.currentUser.cards.forEach(card => {
      if (cardIds.includes(card.id)) {
        card.exp += amount;
        while (card.exp >= card.maxExp) {
          card.exp -= card.maxExp;
          card.level++;
          card.maxExp = Math.floor(card.maxExp * 1.2);
          this.recalculateAttributes(card);
          logs.push(`${card.name} 升级了！(Lv.${card.level})`);
        }
      }
    });

    this.saveUserToDb();
    return logs;
  }

  private recalculateAttributes(card: Card) {
    const multiplier = 1 + (card.level - 1) * 0.1; // 10% growth per level
    card.attributes = {
      thinking: Math.floor(card.baseAttributes.thinking * multiplier),
      insight: Math.floor(card.baseAttributes.insight * multiplier),
      imagination: Math.floor(card.baseAttributes.imagination * multiplier),
    };
  }

  // --- Private Helpers ---

  private saveUserToDb() {
    if (this.currentUser) {
      const db = this.getDb();
      if (db[this.currentUser.uid]) {
        db[this.currentUser.uid].data = this.currentUser;
        this.saveDb(db);
      }
    }
  }

  private getDb(): any {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  private saveDb(db: any) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(db));
  }

  private loadUserFromSession() {
    const uid = localStorage.getItem('current_session_uid');
    if (uid) {
      const db = this.getDb();
      if (db[uid]) {
        this.currentUser = db[uid].data;
      }
    }
  }

  private createStarterSave(uid: string, nickname: string): UserSave {
    const starterCards: Card[] = [
      { 
        id: 'c1', name: '课代表·小明', subject: '数学', rarity: 'R', 
        level: 1, exp: 0, maxExp: 100,
        baseAttributes: { thinking: 85, insight: 40, imagination: 30 }, 
        attributes: { thinking: 85, insight: 40, imagination: 30 }, 
        skill: { name: '逻辑解构', type: 'risky', power: 2.5, description: '消耗HP，造成巨额思维力伤害。' },
        description: '为了解题可以废寝忘食。' 
      },
      { 
        id: 'c2', name: '文艺委员·小红', subject: '语文', rarity: 'R', 
        level: 1, exp: 0, maxExp: 100,
        baseAttributes: { thinking: 40, insight: 80, imagination: 60 }, 
        attributes: { thinking: 40, insight: 80, imagination: 60 }, 
        skill: { name: '鼓舞人心', type: 'buff', power: 1, description: '全队攻击力提升(3回合)。' },
        description: '出口成章，治愈人心。' 
      },
      { 
        id: 'c3', name: '科学怪人·阿强', subject: '物理', rarity: 'N', 
        level: 1, exp: 0, maxExp: 100,
        baseAttributes: { thinking: 75, insight: 50, imagination: 40 }, 
        attributes: { thinking: 75, insight: 50, imagination: 40 }, 
        skill: { name: '力场护盾', type: 'shield', power: 2.0, description: '获得高额护盾。' },
        description: '他相信万物皆有力。' 
      },
      { 
        id: 'c4', name: '单词王·Lily', subject: '英语', rarity: 'N', 
        level: 1, exp: 0, maxExp: 100,
        baseAttributes: { thinking: 50, insight: 70, imagination: 50 }, 
        attributes: { thinking: 50, insight: 70, imagination: 50 }, 
        skill: { name: '快速阅读', type: 'draw', power: 1, description: '小伤害，抽1张牌。' },
        description: '过目不忘的记忆力。' 
      },
      { 
        id: 'c5', name: '史学家·老张', subject: '历史', rarity: 'N', 
        level: 1, exp: 0, maxExp: 100,
        baseAttributes: { thinking: 60, insight: 60, imagination: 70 }, 
        attributes: { thinking: 60, insight: 60, imagination: 70 }, 
        skill: { name: '以史为鉴', type: 'debuff', power: 1, description: '使敌人虚弱(伤害降低)3回合。' },
        description: '熟知兴替，沉稳冷静。' 
      }
    ];

    return {
      uid,
      nickname,
      currentLevel: 1,
      cards: starterCards
    };
  }
}
