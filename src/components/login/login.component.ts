import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div class="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <h1 class="text-3xl font-bold text-center mb-8 text-blue-400">学霸联盟</h1>
        
        <div class="mb-6 flex justify-center space-x-4">
          <button (click)="mode.set('login')" 
            [class]="mode() === 'login' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'"
            class="pb-2 font-semibold transition-colors">
            登录
          </button>
          <button (click)="mode.set('register')" 
            [class]="mode() === 'register' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'"
            class="pb-2 font-semibold transition-colors">
            注册
          </button>
        </div>

        @if (error()) {
          <div class="bg-red-900/30 text-red-300 p-3 rounded mb-4 text-sm border border-red-800">
            {{ error() }}
          </div>
        }

        <div class="space-y-4">
          <div>
            <label class="block text-gray-400 text-sm mb-1">UID (账号)</label>
            <input [(ngModel)]="uid" type="text" class="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500 transition-colors">
          </div>
          
          <div>
            <label class="block text-gray-400 text-sm mb-1">密码</label>
            <input [(ngModel)]="password" type="password" class="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500 transition-colors">
          </div>

          @if (mode() === 'register') {
            <div>
              <label class="block text-gray-400 text-sm mb-1">昵称</label>
              <input [(ngModel)]="nickname" type="text" class="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-green-500 transition-colors">
            </div>
          }

          <button (click)="submit()" 
            class="w-full py-3 rounded font-bold text-white shadow-lg transform transition-transform active:scale-95 mt-4"
            [class]="mode() === 'login' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-green-600 hover:bg-green-500'">
            {{ mode() === 'login' ? '开始学习' : '创建档案' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  storage = inject(StorageService);
  game = inject(GameService);

  mode = signal<'login' | 'register'>('login');
  uid = '';
  password = '';
  nickname = '';
  error = signal('');

  submit() {
    this.error.set('');
    if (!this.uid || !this.password) {
      this.error.set('请填写完整信息');
      return;
    }

    if (this.mode() === 'login') {
      if (this.storage.login(this.uid, this.password)) {
        this.game.viewState.set('dashboard');
      } else {
        this.error.set('账号或密码错误，或账号不存在');
      }
    } else {
      if (!this.nickname) {
        this.error.set('请输入昵称');
        return;
      }
      if (this.storage.register(this.uid, this.password, this.nickname)) {
        // Auto login after register
        this.storage.login(this.uid, this.password);
        this.game.viewState.set('dashboard');
      } else {
        this.error.set('该UID已被注册');
      }
    }
  }
}
