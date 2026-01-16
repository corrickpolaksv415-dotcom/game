import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';
import { StorageService } from '../../services/storage.service';
import { GeminiService } from '../../services/gemini.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-screen bg-gray-900 text-white">
      <!-- Header -->
      <header class="bg-gray-800 p-4 shadow-md flex justify-between items-center z-10 border-b border-gray-700">
        <div>
          <h2 class="text-xl font-bold text-blue-400">学霸联盟</h2>
          <p class="text-xs text-gray-400">UID: {{ user()?.uid }} | 昵称: {{ user()?.nickname }}</p>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-sm bg-gray-700 px-3 py-1 rounded-full border border-gray-600">
            最高关卡: <span class="text-blue-300 font-bold">{{ user()?.currentLevel }}</span>
          </div>
          <button (click)="logout()" class="text-xs text-red-400 hover:text-red-300 hover:underline">退出</button>
        </div>
      </header>

      <!-- Main Content Area -->
      <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        <!-- Sidebar: Card Deck -->
        <div class="w-full md:w-1/3 lg:w-1/4 bg-gray-800/50 p-4 overflow-y-auto border-r border-gray-700 custom-scroll">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
            <span>我的学霸团</span>
            <span class="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">{{ user()?.cards?.length }}人</span>
          </h3>
          <div class="grid grid-cols-1 gap-3">
            @for (card of user()?.cards; track card.id) {
              <div class="bg-gray-700/80 p-3 rounded-lg border border-gray-600 hover:border-blue-500 transition-colors group cursor-default relative overflow-hidden">
                
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-blue-200">{{ card.name }}</span>
                    <span class="text-xs font-bold text-yellow-400">Lv.{{ card.level }}</span>
                  </div>
                  <span class="text-[10px] font-mono bg-gray-900 px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">{{ card.subject }}</span>
                </div>
                
                <!-- Exp Bar -->
                <div class="w-full h-1 bg-gray-900 rounded-full mb-2 overflow-hidden">
                  <div class="bg-yellow-600 h-full" [style.width.%]="(card.exp / card.maxExp) * 100"></div>
                </div>

                <!-- Skill Mini View -->
                <div class="bg-gray-800/50 rounded p-2 mb-2 border border-gray-700/50">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-bold text-yellow-500">{{ card.skill.name }}</span>
                    <span class="text-[9px] px-1 rounded bg-gray-700 text-gray-400 uppercase">{{ card.skill.type }}</span>
                  </div>
                  <div class="text-[10px] text-gray-400 leading-tight">{{ card.skill.description }}</div>
                </div>

                <div class="grid grid-cols-3 gap-1 text-[10px] text-gray-300 font-mono">
                  <div class="bg-gray-800 rounded p-1 text-center border border-gray-700">思 {{card.attributes.thinking}}</div>
                  <div class="bg-gray-800 rounded p-1 text-center border border-gray-700">洞 {{card.attributes.insight}}</div>
                  <div class="bg-gray-800 rounded p-1 text-center border border-gray-700">想 {{card.attributes.imagination}}</div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Main: Level Select -->
        <div class="flex-1 p-6 overflow-y-auto bg-gray-900 relative custom-scroll">
          
          <!-- AI Loading Overlay -->
          @if (loadingAI()) {
            <div class="absolute inset-0 bg-gray-900/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
              <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-6"></div>
              <p class="text-purple-300 animate-pulse text-lg font-bold">教导主任正在出题中...</p>
              <p class="text-gray-500 text-sm mt-2">AI 正在生成题目与数值</p>
            </div>
          }

          <h3 class="text-2xl font-bold mb-6 flex items-center gap-2">
            <span class="w-2 h-8 bg-blue-500 rounded-full"></span>
            挑战关卡
          </h3>

          <!-- Random Levels (AI) -->
          <div class="mb-10 bg-gray-800/30 p-6 rounded-xl border border-gray-700/50">
            <h4 class="text-purple-400 font-bold mb-4 flex items-center gap-2 text-lg">
              <span class="text-2xl">🎲</span>
              AI 随机模拟考
            </h4>
            <p class="text-gray-400 text-sm mb-4">挑战由AI实时生成的试卷Boss，包含未知的描述和数值，难度逐渐递增。</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              @for (diff of [1,2,3,4,5]; track diff) {
                <button (click)="startRandom(diff)" 
                  class="relative overflow-hidden bg-purple-900/20 border border-purple-800/50 hover:bg-purple-800/40 hover:border-purple-500 p-4 rounded-xl flex flex-col items-center justify-center transition-all group h-24">
                  <div class="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span class="text-xl mb-1 group-hover:scale-110 transition-transform font-bold text-purple-300">Lv.{{diff}}</span>
                  <span class="text-xs text-purple-400/70 group-hover:text-purple-300">
                    {{ diff === 1 ? '简单' : diff === 2 ? '普通' : diff === 3 ? '困难' : diff === 4 ? '专家' : '噩梦' }}
                  </span>
                </button>
              }
            </div>
          </div>

          <!-- Fixed Levels -->
          <div>
             <h4 class="text-blue-400 font-bold mb-4 flex items-center gap-2 text-lg">
               <span class="text-2xl">📚</span>
               学业生涯 (100层)
             </h4>
             <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
               @for (lvl of levels; track lvl) {
                 <button (click)="startLevel(lvl)" 
                   [disabled]="lvl > (user()?.currentLevel || 1)"
                   class="aspect-square rounded-lg flex flex-col items-center justify-center font-bold text-sm border transition-all relative group"
                   [class]="getLevelClass(lvl)">
                   
                   @if (lvl < (user()?.currentLevel || 1)) {
                     <span class="text-green-500/50 text-[10px] absolute top-1 right-1">✓</span>
                   }
                   
                   <span class="z-10 text-lg">{{ lvl }}</span>
                   
                   @if (lvl === (user()?.currentLevel || 1)) {
                     <span class="absolute -bottom-2 w-full h-1 bg-blue-400 shadow-[0_0_10px_#60a5fa]"></span>
                   }
                 </button>
               }
             </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scroll::-webkit-scrollbar { width: 6px; }
    .custom-scroll::-webkit-scrollbar-track { background: #111827; }
    .custom-scroll::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
    .custom-scroll::-webkit-scrollbar-thumb:hover { background: #4b5563; }
  `]
})
export class DashboardComponent {
  game = inject(GameService);
  storage = inject(StorageService);
  gemini = inject(GeminiService);

  loadingAI = signal(false);

  // Generate array 1-100
  levels = Array.from({length: 100}, (_, i) => i + 1);

  user = computed(() => this.storage.getCurrentUser());

  getLevelClass(lvl: number) {
    const current = this.user()?.currentLevel || 1;
    if (lvl < current) return 'bg-gray-800 border-gray-700 text-gray-500 hover:border-green-800 hover:text-green-400';
    if (lvl === current) return 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 scale-105';
    return 'bg-gray-900 border-gray-800 text-gray-700 cursor-not-allowed';
  }

  startLevel(lvl: number) {
    if (lvl > (this.user()?.currentLevel || 1)) return;
    this.game.startFixedLevel(lvl);
  }

  async startRandom(difficulty: number) {
    this.loadingAI.set(true);
    const enemyData = await this.gemini.generateRandomLevel(difficulty);
    this.loadingAI.set(false);
    this.game.startRandomLevel(enemyData);
  }

  logout() {
    this.storage.logout();
    this.game.viewState.set('login');
  }
}
