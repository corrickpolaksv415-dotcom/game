import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-battle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-screen bg-gray-950 text-white overflow-hidden relative font-sans"
         [class.shake-screen]="game.animationState() === 'enemy_impact' && game.impactType() !== 'shield'">
      
      <!-- 1. Background Ambience -->
      <div class="absolute inset-0 opacity-20 pointer-events-none transition-colors duration-1000"
        [ngClass]="{
          'bg-red-900': game.enemy()?.subject === '语文',
          'bg-blue-900': game.enemy()?.subject === '数学',
          'bg-yellow-900': game.enemy()?.subject === '英语',
          'bg-green-900': game.enemy()?.subject === '生物',
          'bg-purple-900': game.enemy()?.subject === '化学'
        }">
      </div>

      <!-- 2. Top Bar -->
      <div class="bg-gray-900/90 p-3 flex justify-between items-center z-10 border-b border-gray-800 backdrop-blur-md">
        <button (click)="quit()" class="text-gray-400 hover:text-white px-3 text-sm font-bold border border-gray-600 rounded hover:bg-gray-700 transition">Esc 逃跑</button>
        <div class="flex flex-col items-center">
           <span class="font-bold text-xl tracking-wider">{{ game.enemy()?.name }}</span>
           <span class="text-xs text-gray-400">科目: {{ game.enemy()?.subject }}</span>
        </div>
        <div class="w-16"></div>
      </div>

      <!-- 3. Arena (Middle) -->
      <div class="flex-1 flex flex-col items-center justify-center p-4 relative z-0">
        
        <!-- Enemy Unit Container -->
        <div class="w-full max-w-lg mb-4 text-center relative">
          
          <!-- Enemy Impact Effect Overlay -->
          @if (game.animationState() === 'player_impact') {
            <div class="absolute inset-0 flex items-center justify-center z-50 animate-pop-in">
              <span class="text-6xl font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                 [ngClass]="{
                   'text-red-500': game.impactType() === 'physical',
                   'text-purple-400': game.impactType() === 'magical',
                   'text-green-400': game.impactType() === 'heal',
                   'text-yellow-400': game.impactType() === 'shield'
                 }">
                 {{ game.impactValue() }}
              </span>
            </div>
            <!-- Particle Burst -->
             <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/20 rounded-full animate-ping-slow pointer-events-none"></div>
          }

          <!-- Enemy Avatar -->
          <div class="relative inline-block mb-4 transition-transform duration-200"
               [class.animate-float]="game.animationState() === 'idle'"
               [class.animate-lunge]="game.animationState() === 'enemy_cast'"
               [class.shake-target]="game.animationState() === 'player_impact'">
            
            <div class="w-32 h-32 mx-auto bg-gray-800 rounded-full border-4 flex items-center justify-center shadow-[0_0_50px_rgba(255,0,0,0.2)]"
              [class.border-red-500]="true">
              <span class="text-5xl">👿</span>
            </div>
            
            <!-- Subject Badge -->
            <div class="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full border border-red-400 font-bold shadow-lg">
              {{ game.enemy()?.subject }}
            </div>
            
            <div class="absolute -bottom-2 w-full text-center">
               <span class="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full shadow font-bold">ATK: {{ game.enemy()?.atk }}</span>
            </div>
          </div>
          
          <p class="text-gray-400 text-sm mb-2 h-5">{{ game.enemy()?.description }}</p>

          <!-- Enemy HP Bar -->
          <div class="relative w-64 mx-auto h-5 bg-gray-800 rounded-full border border-gray-600 overflow-hidden shadow-inner">
            <div class="bg-gradient-to-r from-red-600 to-red-500 h-full transition-all duration-300 ease-out"
              [style.width.%]="enemyHpPercent()">
            </div>
            <div class="absolute inset-0 flex items-center justify-center text-[10px] font-bold shadow-text z-10">
               {{ game.enemy()?.hp }} / {{ game.enemy()?.maxHp }}
            </div>
          </div>
        </div>

        <!-- Combat Log -->
        <div class="w-full max-w-xl h-28 overflow-hidden bg-black/50 rounded-lg p-3 text-sm font-mono border border-gray-700 shadow-inner">
          @for (log of game.turnLog(); track $index) {
            <div class="mb-1 text-gray-300 animate-slide-up border-l-2 border-blue-500/30 pl-2">{{ log }}</div>
          }
        </div>

      </div>

      <!-- 4. Player HUD (Bottom) -->
      <div class="bg-gray-900 border-t border-gray-800 p-4 pb-6 z-10 shadow-[0_-10px_50px_rgba(0,0,0,0.6)] relative">
        
        <!-- Player Impact Overlay (Damage Taken) -->
        @if (game.animationState() === 'enemy_impact') {
           <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 z-50 animate-pop-up">
              <span class="text-4xl font-bold text-red-500 shadow-text">{{ game.impactValue() }}</span>
           </div>
        }

        <!-- Player Stats -->
        <div class="max-w-5xl mx-auto flex items-center gap-6 mb-4 px-2">
          
          <!-- HP Bar -->
          <div class="flex-1">
            <div class="flex justify-between text-xs text-blue-300 mb-1">
              <span class="font-bold">精神值 (HP)</span>
              <span>{{ game.playerHp() }} / {{ game.playerMaxHp() }}</span>
            </div>
            <div class="h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700 relative">
              <div class="bg-blue-500 h-full transition-all duration-300" [style.width.%]="playerHpPercent()"></div>
            </div>
          </div>

          <!-- Shield Bar -->
          <div class="flex-1">
             <div class="flex justify-between text-xs text-yellow-300 mb-1">
               <span class="font-bold">护盾 (Shield)</span>
               <span>{{ game.playerShield() }}</span>
             </div>
             <div class="h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700 relative">
               <div class="bg-yellow-500/80 h-full transition-all duration-300" 
                 [style.width.%]="(game.playerShield() / game.playerMaxHp()) * 100"></div>
             </div>
          </div>

          <div class="text-xs text-gray-500 font-mono">
            Deck: {{ game.deck().length }}
          </div>
        </div>

        <!-- Cards Hand -->
        <div class="flex justify-center gap-3 overflow-x-auto py-2 px-4 min-h-[190px]">
          @if (game.hand().length === 0 && game.animationState() === 'idle') {
            <div class="text-gray-500 self-center animate-pulse">思考中... (等待发牌)</div>
          }
          
          @for (card of game.hand(); track card.id; let i = $index) {
            <button (click)="game.playCard(i)"
              [disabled]="game.animationState() !== 'idle'"
              class="relative w-32 h-44 bg-gray-800 rounded-xl border border-gray-600 hover:border-yellow-400 transition-all duration-200 shadow-xl flex flex-col p-2 text-left group shrink-0 overflow-hidden cursor-pointer"
              [class.opacity-50]="game.animationState() !== 'idle'"
              [class.hover:-translate-y-3]="game.animationState() === 'idle'"
              [class.hover:scale-105]="game.animationState() === 'idle'">
              
              <!-- Subject Tag -->
              <div class="absolute top-0 right-0 bg-gray-700 text-[10px] px-2 py-0.5 rounded-bl text-gray-300 font-mono group-hover:bg-yellow-500 group-hover:text-black">
                {{ card.subject }}
              </div>

              <div class="mt-4 text-sm font-bold text-gray-100 group-hover:text-yellow-300 leading-tight">
                {{ card.name }}
              </div>
              
              <div class="mt-2 bg-gray-900/50 rounded p-1.5 border border-gray-700/50">
                <div class="text-[10px] text-blue-300 font-bold mb-0.5">{{ card.skill.name }}</div>
                <div class="text-[9px] text-gray-400 leading-snug line-clamp-3">{{ card.skill.description }}</div>
              </div>

              <div class="mt-auto grid grid-cols-3 gap-0.5 text-[8px] text-gray-500 text-center">
                 <div class="bg-gray-900 rounded py-0.5">思{{card.attributes.thinking}}</div>
                 <div class="bg-gray-900 rounded py-0.5">洞{{card.attributes.insight}}</div>
                 <div class="bg-gray-900 rounded py-0.5">想{{card.attributes.imagination}}</div>
              </div>

              <div class="absolute bottom-1 right-1 w-2 h-2 rounded-full"
                [ngClass]="{
                  'bg-red-500': card.skill.type === 'damage' || card.skill.type === 'risky',
                  'bg-green-500': card.skill.type === 'heal',
                  'bg-yellow-500': card.skill.type === 'shield',
                  'bg-blue-500': card.skill.type === 'draw'
                }"></div>
            </button>
          }
        </div>
      </div>

      <!-- 5. Active Card Animation Overlay (The "Focus" View) -->
      @if (game.activeCard(); as active) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none animate-fade-in-fast">
          <div class="w-64 h-96 bg-gray-800 rounded-2xl border-2 border-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.5)] p-4 flex flex-col relative animate-card-zoom">
            
            <!-- Glow Effect -->
            <div class="absolute -inset-4 bg-blue-500/30 blur-xl -z-10 rounded-full animate-pulse-fast"></div>

            <div class="flex justify-between items-center mb-4">
              <span class="text-xl font-bold text-white">{{ active.name }}</span>
              <span class="bg-blue-600 text-white px-2 py-1 rounded text-xs">{{ active.subject }}</span>
            </div>
            
            <div class="flex-1 flex items-center justify-center my-4">
               <div class="text-6xl animate-bounce-soft">✨</div>
            </div>

            <div class="bg-gray-900/80 p-3 rounded-lg border border-gray-700">
               <div class="text-yellow-400 font-bold mb-1">{{ active.skill.name }}</div>
               <div class="text-gray-300 text-sm">{{ active.skill.description }}</div>
            </div>
          </div>
        </div>
      }

      <!-- Result Modal -->
      @if (game.viewState() === 'result') {
        <div class="absolute inset-0 bg-black/90 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in">
          <div class="bg-gray-800 p-8 rounded-2xl border-2 shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
               [class.border-green-500]="game.battleResult() === 'win'"
               [class.border-red-500]="game.battleResult() === 'lose'">
            
            <div class="absolute inset-0 opacity-10"
               [class.bg-green-500]="game.battleResult() === 'win'"
               [class.bg-red-500]="game.battleResult() === 'lose'"></div>

            <h2 class="text-4xl font-bold mb-4 relative z-10"
                [class.text-green-400]="game.battleResult() === 'win'"
                [class.text-red-500]="game.battleResult() === 'lose'">
                {{ game.battleResult() === 'win' ? '考试通过!' : '挂科警告' }}
            </h2>
            
            <p class="text-gray-300 mb-8 relative z-10">
              {{ game.battleResult() === 'win' ? '你克服了难题，学识精进了！' : '这道题太难了，回去复习一下基础吧。' }}
            </p>

            <button (click)="game.resetToDashboard()" 
              class="w-full py-3 rounded-lg font-bold text-white transition-all relative z-10 transform hover:scale-105"
              [class.bg-green-600]="game.battleResult() === 'win'"
              [class.hover:bg-green-500]="game.battleResult() === 'win'"
              [class.bg-red-600]="game.battleResult() === 'lose'"
              [class.hover:bg-red-500]="game.battleResult() === 'lose'">
              {{ game.battleResult() === 'win' ? '继续深造' : '重整旗鼓' }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Keyframes */
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes lunge { 0% { transform: scale(1); } 40% { transform: scale(0.9) translateY(10px); } 60% { transform: scale(1.2) translateY(-20px); } 100% { transform: scale(1); } }
    @keyframes cardZoom { 0% { transform: scale(0.2) translateY(200px); opacity: 0; } 60% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
    @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.5); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
    @keyframes popUp { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-40px) scale(1.2); opacity: 0; } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    
    /* Utility Classes */
    .animate-float { animation: float 3s ease-in-out infinite; }
    .animate-lunge { animation: lunge 0.5s ease-in-out; }
    .animate-card-zoom { animation: cardZoom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    .animate-shake { animation: shake 0.4s ease-in-out; }
    .animate-pop-in { animation: popIn 0.8s ease-out forwards; }
    .animate-pop-up { animation: popUp 1s ease-out forwards; }
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    .animate-fade-in-fast { animation: fadeIn 0.2s ease-out; }
    .animate-ping-slow { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }
    .animate-pulse-fast { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    .animate-bounce-soft { animation: bounce 2s infinite; }

    .shake-screen { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
    .shake-target { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
    
    .shadow-text { text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
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
