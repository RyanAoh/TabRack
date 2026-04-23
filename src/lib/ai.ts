import { GoogleGenAI } from "@google/genai";

/**
 * AI Config Interfaces
 */
export type AIProvider = 'nano' | 'gemini_cloud' | 'custom_cloud';

export interface AIConfig {
  provider: AIProvider;
  geminiCloudConfig: {
    apiKey?: string;
  };
  customCloudConfig: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
}

export const defaultAIConfig: AIConfig = {
  provider: 'nano',
  geminiCloudConfig: {
    apiKey: process.env.GEMINI_API_KEY || ''
  },
  customCloudConfig: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    model: 'gpt-4o-mini'
  }
};

export function getAIConfig(): AIConfig {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('tabrack_ai_config');
      if (saved) return { ...defaultAIConfig, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading AI config', e);
  }
  return defaultAIConfig;
}

export function saveAIConfig(config: AIConfig) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tabrack_ai_config', JSON.stringify(config));
    }
  } catch(e) {
    console.error('Error saving AI config', e);
  }
}

/**
 * Core Summarization Logic unified across providers
 */
export async function summarizeTab(title: string, url: string, lang?: string, content?: string) {
  const config = getAIConfig();
  
  const languageInstruction = lang === 'zh' ? 'Simplified Chinese (简体中文)' : 'English';
  const failureMessage = lang === 'zh' ? '无法生成有效的摘要' : 'Unable to generate a valid summary';
  const extractedContent = content ? content.substring(0, 2500) : 'No body content available. Please infer from the title and URL.';

  const prompt = `You are an intelligent web content summarization assistant.

## Input
URL: ${url}
Title: ${title}
Webpage Content:
"""
${extractedContent}
"""

## Task Workflow (must follow strictly)

### Step 1: Content verification
- Analyze the Webpage Content provided within the Input section.

### Step 2: Content cleaning
Extract only the main article content and remove:
- Ads
- Navigation menus
- Footers
- Recommended/related links
- Comments
- Irrelevant boilerplate content

### Step 3: Content understanding
Understand the page by identifying:
- Main topic
- Background context
- Key events or arguments
- Important facts or data
- Conclusion or outcome (if any)

### Step 4: Summarization
Generate a concise summary within **200 words maximum**.

---

## Output Requirements

- Must be strictly based on the webpage content, no hallucination
- Prioritize important information over minor details
- Do NOT use bullet points or headings
- Output must be a single coherent paragraph
- Keep it within 200 words (prefer 100–200 words)
- CRITICAL REQUIREMENT: The final output MUST be strictly written in ${languageInstruction}.

---

## Output Format

Return only the summary text.

---

## Failure Cases

If:
- Content is empty, unreadable, or missing and cannot be summarized from title
- Insufficient information to summarize

Return:
${failureMessage}`;

  let currentProvider = config.provider;

  // 1. Try Gemini Nano
  if (currentProvider === 'nano') {
    if (typeof window !== 'undefined' && (window as any).ai?.textModel) {
      try {
        const session = await (window as any).ai.textModel.create();
        const result = await session.prompt(prompt);
        session.destroy();
        return result;
      } catch (e) {
        console.error('Gemini Nano prompt failed. Falling back...', e);
      }
    } else {
      console.warn('Gemini Nano is not available in environment. Check chrome://flags.');
    }
    // Automatically fall back to Gemini Cloud if Nano isn't available
    currentProvider = 'gemini_cloud';
  }
  
  // 2. Try Gemini Cloud API (Free Tier or User Key)
  if (currentProvider === 'gemini_cloud') {
    const key = config.geminiCloudConfig.apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });
        if (response.text) {
          return response.text;
        }
      } catch(e) {
        console.error('Gemini Cloud API failed:', e);
      }
    } else {
      console.error('No Gemini API Key available');
    }
  }

  // 3. Try Custom Cloud API (e.g. OpenAI Compatible)
  if (currentProvider === 'custom_cloud') {
    if (config.customCloudConfig.baseUrl && config.customCloudConfig.apiKey) {
      try {
        const res = await fetch(config.customCloudConfig.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.customCloudConfig.apiKey}`
          },
          body: JSON.stringify({
            model: config.customCloudConfig.model,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const data = await res.json();
        if (data.choices && data.choices[0]?.message?.content) {
          return data.choices[0].message.content;
        }
      } catch(e) {
        console.error('Custom Cloud Request failed:', e);
      }
    } else {
      console.error('Custom Cloud Configuration is missing parameters');
    }
  }

  // 4. Ultimate Mock Fallback 
  await new Promise(r => setTimeout(r, 1200)); // Simulate think time
  if (content && content.length > 50) {
    const cleaned = content.replace(/\s+/g, ' ').trim();
    const sentences = cleaned.split(/(?<=[.!?。！？\n])\s+/);
    const validSentences = sentences.filter(s => s.length > 25 && s.length < 300).slice(0, 2);
    if (validSentences.length > 0) {
      const listText = validSentences.map((s, i) => `${i + 1}. ${s}`).join('\n');
      return (lang === 'zh' ? `🌟 智能提取自原文重点：\n${listText}` : `🌟 Extracted from body:\n${listText}`);
    } else if (cleaned.length > 0) {
      return (lang === 'zh' ? '🌟 智能首段摘录：' : '🌟 Extracted Intro: ') + cleaned.substring(0, 150) + '...';
    }
  }

  if (lang === 'zh') {
    if (url.includes('github') || title.toLowerCase().includes('github')) return '这是一个关于代码开源或项目构建的开发者页面。通常包含README说明、安装指南或问题追踪日志，对相关开发有参考价值。';
    if (url.includes('youtube') || title.toLowerCase().includes('video')) return '该网页包含一个在线视频或流媒体内容。请配合查阅视频自带的文字详情以获取核心要点。';
    if (url.includes('news') || url.includes('article') || title.toLowerCase().includes('news')) return `这是一篇详细的在线文章，聚焦于【${title.slice(0,10)}】。`;
    return `由于缺少可读内容或AI配置异常，系统推测此为展示页面或功能入口。`;
  } else {
    if (url.includes('github') || title.toLowerCase().includes('github')) return 'This is an open-source project or repository containing code documentation and installation guides.';
    if (url.includes('youtube') || title.toLowerCase().includes('video')) return 'This webpage features multimedia content. Please refer to its description for main points.';
    if (url.includes('news') || url.includes('article') || title.toLowerCase().includes('news')) return `This appears to be an online article covering details about [${title.slice(0,10)}].`;
    return `Due to missing configurations or inaccessible content, this is inferred to be a basic layout page.`;
  }
}

