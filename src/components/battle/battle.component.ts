import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-battle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-screen bg-gray-950 text-white overflow-hidden relative">
      
      <!-- Background Ambience (Subject based color hint) -->
      <div class="absolute inset-0 opacity-10 pointer-events-none"
        [ngClass]="{
          'bg-red-900': game.enemy()?.subject === '语文',
          'bg-blue-900': game.enemy()?.subject === '数学',
          'bg-yellow-900': game.enemy()?.subject === '英语'
        }">
      </div>

      <!-- Top Bar: Battle Info -->
      <div class="bg-gray-900/80 p-2 flex justify-between items-center z-10 border-b border-gray-800 backdrop-blur">
        <button (click)="quit()" class="text-gray-400 hover:text-white px-3 text-sm">Esc 逃跑</button>
        <div class="font-bold text-lg text-center flex-1">{{ game.enemy()?.name }}</div>
        <div class="w-16"></div> <!-- Spacer -->
      </div>

      <!-- Battle Arena -->
      <div class="flex-1 flex flex-col items-center justify-center p-4 relative z-0">
        
        <!-- Enemy Section -->
        <div class="w-full max-w-lg mb-8 text-center animate-bounce-slow">
          <div class="inline-block relative">
            <!-- Enemy Avatar / Placeholder -->
            <div class="w-32 h-32 mx-auto bg-gray-800 rounded-full border-4 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)] mb-4"
              [class.border-red-500]="true">
              <span class="text-4xl">👹</span>
            </div>
            <!-- Subject Badge -->
            <span class="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full border border-red-400 font-bold">
              {{ game.enemy()?.subject }}
            </span>
          </div>
          
          <h2 class="text-2xl font-bold text-red-400 mb-1">{{ game.enemy()?.name }}</h2>
          <p class="text-gray-400 text-sm mb-4 max-w-xs mx-auto">{{ game.enemy()?.description }}</p>

          <!-- HP Bar Enemy -->
          <div class="w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-gray-700">
            <div class="bg-red-600 h-full transition-all duration-500 ease-out"
              [style.width.%]="enemyHpPercent()">
            </div>
          </div>
          <div class="text-xs text-red-300 mt-1">{{ game.enemy()?.hp }} / {{ game.enemy()?.maxHp }} HP</div>
        </div>

        <!-- Combat Log -->
        <div class="w-full max-w-xl h-24 overflow-hidden mb-4 bg-black/40 rounded p-2 text-sm text-gray-300 font-mono border-l-2 border-blue-500/50">
          @for (log of game.turnLog(); track $index) {
            <div class="animate-fade-in mb-1">{{ log }}</div>
          }
        </div>

      </div>

      <!-- Player Section (Bottom) -->
      <div class="bg-gray-900 border-t border-gray-800 p-4 pb-8 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        
        <!-- Player Status -->
        <div class="max-w-4xl mx-auto flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
             <div class="text-blue-400 font-bold">学习动力 (HP)</div>
             <div class="w-48 bg-gray-800 rounded-full h-3 border border-gray-700">
               <div class="bg-blue-500 h-full transition-all duration-300"
                 [style.width.%]="playerHpPercent()"></div>
             </div>
             <span class="text-sm">{{ game.playerHp() }} / {{ game.playerMaxHp() }}</span>
          </div>
          <div class="text-gray-400 text-sm">
            牌库剩余: {{ game.deck().length }}
          </div>
        </div>

        <!-- Hand Cards -->
        <div class="flex justify-center gap-2 md:gap-4 overflow-x-auto px-4 pb-2 min-h-[160px]">
          @if (game.hand().length === 0) {
            <div class="text-gray-500 self-center">正在思考中... (抽牌中)</div>
          }
          
          @for (card of game.hand(); track card.id; let i = $index) {
            <button (click)="game.playCard(i)"
              class="relative w-28 h-40 bg-gray-800 rounded-lg border border-gray-600 hover:border-yellow-400 hover:-translate-y-4 transition-all duration-200 shadow-xl flex flex-col p-2 text-left group shrink-0">
              <!-- Card Subject Badge -->
              <div class="absolute -top-2 -left-2 bg-blue-900 text-blue-200 text-[10px] px-1.5 py-0.5 rounded border border-blue-700">
                {{ card.subject }}
              </div>
              
              <div class="mt-2 text-sm font-bold text-gray-200 leading-tight group-hover:text-yellow-300">{{ card.name }}</div>
              <div class="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-snug">{{ card.description }}</div>
              
              <!-- Stats -->
              <div class="mt-auto grid grid-cols-1 gap-1 text-[9px] text-gray-400">
                <div class="flex justify-between bg-gray-900 px-1 rounded"><span>思</span><span>{{ card.attributes.thinking }}</span></div>
                <div class="flex justify-between bg-gray-900 px-1 rounded"><span>洞</span><span>{{ card.attributes.insight }}</span></div>
              </div>
            </button>
          }
        </div>
      </div>

      <!-- Result Overlay -->
      @if (game.viewState() === 'result') {
        <div class="absolute inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
          <div class="bg-gray-800 p-8 rounded-2xl border-2 shadow-2xl max-w-sm w-full text-center"
               [class.border-green-500]="game.battleResult() === 'win'"
               [class.border-red-500]="game.battleResult() === 'lose'">
            
            <h2 class="text-4xl font-bold mb-4"
                [class.text-green-400]="game.battleResult() === 'win'"
                [class.text-red-500]="game.battleResult() === 'lose'">
                {{ game.battleResult() === 'win' ? '考试通过!' : '挂科了...' }}
            </h2>
            
            <p class="text-gray-300 mb-8">
              {{ game.battleResult() === 'win' ? '你战胜了难题，获得了新的知识（可能还有新朋友）！' : '不要气馁，回去复习一下再来！' }}
            </p>

            <button (click)="game.resetToDashboard()" 
              class="w-full py-3 rounded-lg font-bold text-white transition-colors"
              [class.bg-green-600]="game.battleResult() === 'win'"
              [class.hover:bg-green-500]="game.battleResult() === 'win'"
              [class.bg-red-600]="game.battleResult() === 'lose'"
              [class.hover:bg-red-500]="game.battleResult() === 'lose'">
              返回大厅
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .animate-bounce-slow {
      animation: bounce 3s infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(-2%); }
      50% { transform: translateY(2%); }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class BattleComponent {
  game = inject(GameService);

  enemyHpPercent = computed(() => {
    const e = this.game.enemy();
    if (!e || e.maxHp === 0) return 0;
    return (e.hp / e.maxHp) * 100;
  });

  playerHpPercent = computed(() => {
    if (this.game.playerMaxHp() === 0) return 0;
    return (this.game.playerHp() / this.game.playerMaxHp()) * 100;
  });

  quit() {
    if (confirm('确定要放弃这场考试吗？(视为失败)')) {
      this.game.resetToDashboard();
    }
  }
}
