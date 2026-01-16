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
      <header class="bg-gray-800 p-4 shadow-md flex justify-between items-center z-10">
        <div>
          <h2 class="text-xl font-bold text-blue-400">学霸联盟</h2>
          <p class="text-xs text-gray-400">UID: {{ user()?.uid }} | 昵称: {{ user()?.nickname }}</p>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-sm bg-gray-700 px-3 py-1 rounded-full">
            最高关卡: {{ user()?.currentLevel }}
          </div>
          <button (click)="logout()" class="text-xs text-red-400 hover:text-red-300">退出</button>
        </div>
      </header>

      <!-- Main Content Area -->
      <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        <!-- Sidebar: Card Deck -->
        <div class="w-full md:w-1/3 lg:w-1/4 bg-gray-800/50 p-4 overflow-y-auto border-r border-gray-700">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
            <span>我的朋友们</span>
            <span class="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">{{ user()?.cards?.length }}</span>
          </h3>
          <div class="grid grid-cols-1 gap-3">
            @for (card of user()?.cards; track card.id) {
              <div class="bg-gray-700 p-3 rounded-lg border border-gray-600 hover:border-blue-500 transition-colors group">
                <div class="flex justify-between items-start">
                  <span class="font-bold text-blue-200">{{ card.name }}</span>
                  <span class="text-xs font-mono bg-gray-900 px-1 rounded text-gray-400">{{ card.subject }}</span>
                </div>
                <div class="text-xs text-gray-400 mt-1">{{ card.description }}</div>
                <div class="grid grid-cols-3 gap-1 mt-2 text-[10px] text-gray-300">
                  <div class="bg-gray-800 rounded p-1 text-center">思:{{card.attributes.thinking}}</div>
                  <div class="bg-gray-800 rounded p-1 text-center">洞:{{card.attributes.insight}}</div>
                  <div class="bg-gray-800 rounded p-1 text-center">想:{{card.attributes.imagination}}</div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Main: Level Select -->
        <div class="flex-1 p-6 overflow-y-auto bg-gray-900 relative">
          
          <!-- AI Loading Overlay -->
          @if (loadingAI()) {
            <div class="absolute inset-0 bg-gray-900/80 z-20 flex flex-col items-center justify-center">
              <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p class="text-purple-300 animate-pulse">教导主任正在出题中(AI生成)...</p>
            </div>
          }

          <h3 class="text-2xl font-bold mb-6">挑战关卡</h3>

          <!-- Random Levels (AI) -->
          <div class="mb-8">
            <h4 class="text-purple-400 font-bold mb-3 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
              AI 随机模拟考
            </h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              @for (diff of [1,2,3,4,5]; track diff) {
                <button (click)="startRandom(diff)" 
                  class="bg-purple-900/40 border border-purple-700 hover:bg-purple-800 hover:border-purple-500 p-4 rounded-xl flex flex-col items-center justify-center transition-all group">
                  <span class="text-2xl mb-1 group-hover:scale-110 transition-transform">🎲</span>
                  <span class="text-sm font-bold text-purple-200">难度 {{diff}}</span>
                </button>
              }
            </div>
          </div>

          <!-- Fixed Levels -->
          <div>
             <h4 class="text-blue-400 font-bold mb-3">学业生涯 (固定关卡)</h4>
             <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
               @for (lvl of levels; track lvl) {
                 <button (click)="startLevel(lvl)" 
                   [disabled]="lvl > (user()?.currentLevel || 1)"
                   class="aspect-square rounded-lg flex items-center justify-center font-bold text-sm border transition-all"
                   [class]="getLevelClass(lvl)">
                   {{ lvl }}
                 </button>
               }
             </div>
          </div>
        </div>
      </div>
    </div>
  `
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
    if (lvl < current) return 'bg-green-900/50 border-green-700 text-green-400 hover:bg-green-800';
    if (lvl === current) return 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 scale-105';
    return 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed opacity-50';
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
