import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Assuming API Key is available in the environment as per instructions
    // In a real local app, this might need a user input, but strict instructions say use process.env.API_KEY
    // Since this is a browser applet, process.env might be polyfilled or we assume it works.
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] || '' });
  }

  async generateRandomLevel(difficulty: number) {
    // Difficulty 1-5
    const prompt = `设计一个卡牌游戏的Boss（考试题目）。
    难度等级: ${difficulty} (1-5)。
    科目从以下随机选择一个: 语文, 数学, 英语, 生物, 地理, 历史, 政治, 物理, 化学。
    Boss要有名字（例如：'压轴导数题'，'古文背诵'），生命值（HP），攻击力（ATK），以及一段有趣的描述。
    HP范围: ${difficulty * 100} - ${difficulty * 150}。
    ATK范围: ${difficulty * 10} - ${difficulty * 15}。
    请返回JSON格式。`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              subject: { type: Type.STRING },
              hp: { type: Type.INTEGER },
              atk: { type: Type.INTEGER },
              description: { type: Type.STRING },
            }
          }
        }
      });
      
      const jsonStr = response.text || '{}';
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('AI Generation Failed, using fallback', e);
      return {
        name: '未知的试卷',
        subject: '数学',
        hp: difficulty * 100,
        atk: difficulty * 10,
        description: '一张模糊不清的试卷，散发着诡异的气息。'
      };
    }
  }
}
