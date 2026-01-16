import { Injectable } from '@angular/core';

export interface Skill {
  name: string;
  type: 'damage' | 'heal' | 'shield' | 'draw' | 'risky'; // risky = high dmg, self dmg
  power: number; // Multiplier or flat value depending on type
  description: string;
}

export interface Card {
  id: string;
  name: string;
  subject: '语文' | '数学' | '英语' | '生物' | '地理' | '历史' | '政治' | '物理' | '化学';
  rarity: 'N' | 'R' | 'SR' | 'SSR';
  attributes: {
    thinking: number; // 思维力 (Math, Phy, Chem)
    insight: number;  // 洞察力 (Chi, Eng, Pol)
    imagination: number; // 想象力 (Bio, His, Geo)
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
    
    // Update local state
    if (level > this.currentUser.currentLevel) {
      this.currentUser.currentLevel = level;
    }
    this.currentUser.cards = [...this.currentUser.cards, ...newCards];

    // Persist to DB
    const db = this.getDb();
    if (db[this.currentUser.uid]) {
      db[this.currentUser.uid].data = this.currentUser;
      this.saveDb(db);
    }
  }

  // --- Private Helpers ---

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
    return {
      uid,
      nickname,
      currentLevel: 1,
      cards: [
        { 
          id: 'c1', name: '课代表·小明', subject: '数学', rarity: 'R', 
          attributes: { thinking: 85, insight: 40, imagination: 30 }, 
          skill: { name: '逻辑解构', type: 'risky', power: 2.5, description: '消耗10%当前HP，造成250%思维力伤害。' },
          description: '为了解题可以废寝忘食。' 
        },
        { 
          id: 'c2', name: '文艺委员·小红', subject: '语文', rarity: 'R', 
          attributes: { thinking: 40, insight: 80, imagination: 60 }, 
          skill: { name: '唐诗三百', type: 'heal', power: 1.5, description: '恢复相当于150%洞察力的生命值，并造成少量伤害。' },
          description: '出口成章，治愈人心。' 
        },
        { 
          id: 'c3', name: '科学怪人·阿强', subject: '物理', rarity: 'N', 
          attributes: { thinking: 75, insight: 50, imagination: 40 }, 
          skill: { name: '力场护盾', type: 'shield', power: 2.0, description: '获得相当于200%思维力的护盾，并造成普通伤害。' },
          description: '他相信万物皆有力。' 
        },
        { 
          id: 'c4', name: '单词王·Lily', subject: '英语', rarity: 'N', 
          attributes: { thinking: 50, insight: 70, imagination: 50 }, 
          skill: { name: '快速阅读', type: 'draw', power: 1, description: '造成普通伤害，并抽取1张卡牌。' },
          description: '过目不忘的记忆力。' 
        },
        { 
          id: 'c5', name: '史学家·老张', subject: '历史', rarity: 'N', 
          attributes: { thinking: 60, insight: 60, imagination: 70 }, 
          skill: { name: '以史为鉴', type: 'damage', power: 1.2, description: '造成120%想象力伤害，属性克制时效果翻倍。' },
          description: '熟知兴替，沉稳冷静。' 
        }
      ]
    };
  }
}
