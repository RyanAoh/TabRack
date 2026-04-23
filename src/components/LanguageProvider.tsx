import React, { createContext, useContext, useEffect, useState } from 'react';

type Language = 'system' | 'en' | 'zh';
type ResolvedLanguage = 'en' | 'zh';

const translations = {
  en: {
    title: 'TabRack',
    search_placeholder: 'Search tabs or type commands...',
    dedupe: 'Deduplication',
    memory_release: 'Memory Release',
    by_domain: 'By Domain',
    by_base_domain: 'By Base Domain',
    by_full_domain: 'By Full Domain',
    settings: 'Settings',
    settings_desc: 'Manage your TabRack preferences.',
    language: 'Language',
    language_desc: 'Interface language',
    system_default: 'System Default',
    view_mode: 'Default View Mode',
    view_mode_desc: 'Choose how tabs are displayed',
    group_mode: 'Default Group Mode',
    group_mode_desc: 'Choose how tabs are grouped by default',
    auto_discard: 'Auto-Discard Timeout',
    auto_discard_desc: 'Time before sleeping tabs',
    expanded: 'Expanded',
    compact: 'Compact',
    done: 'Done',
    cmd_palette: 'Global Command Palette',
    cmd_palette_desc: 'Shortcut to open the palette',
    no_tabs: 'No tabs found',
    tabs_count: 'Tabs',
    active_tabs: 'Active Tabs',
    slept_tabs: 'Slept',
    all_tabs: 'All Tabs',
    read_later: 'Read Later',
    window: 'Window',
    close_all_tabs: 'Close all tabs',
    close_duplicate_tabs: 'Close Duplicate Tabs?',
    duplicate_tabs_desc: 'duplicate tabs across your windows. Uncheck any tab you want to keep.',
    we_found: 'We found',
    cancel: 'Cancel',
    close_selected: 'Close Selected',
    switch_tab: 'Switch to tab',
    failed_to_save: 'Failed to save',
    keep_one_tab: 'Keep exactly one tab',
    closed_duplicates: 'Closed {count} duplicates',
    closed_domain_tabs: 'Closed {count} tabs from {domain}',
    kept_one_tab_toast: 'Kept 1 tab, closed {count} for {domain}',
    memory_freed: 'Freed up memory. {active} active, {slept} slept',
    dashboard_soon: 'Dashboard coming soon...',
    saving_session: 'Saving session...',
    discarding_tabs: 'Discarding inactive tabs...',
    preview_mode: ' (Preview)',
    dedupe_requested: 'Deduplication requested',
    reading_list_empty: 'Your reading list is empty',
    summarize: 'AI Summarize',
    no_duplicates: 'No duplicates found',
    ai_summary: 'AI Summary',
    category: 'Category',
    all_categories: 'All Categories',
    uncategorized: 'Uncategorized',
    tech: 'Tech & Dev',
    read: 'Reading & News',
    tool: 'Tools & Utilities',
    work: 'Work & Docs',
    social: 'Social & Media',
    edit_categories: 'Edit Custom Categories',
    new_category: 'New category...',
    press_enter_to_add: 'Press Enter to add.',
    ai_engine_config: 'AI Engine Configuration',
    provider: 'Provider',
    gemini_nano: 'Google Gemini Nano (Local Chrome)',
    gemini_cloud: 'Google Gemini Cloud (API)',
    custom_cloud: 'Custom Cloud (OpenAI Compatible)',
    gemini_api_key_desc: 'Optional: Enter your own Gemini API Key. If left blank, it will use the platform default if available.',
    base_url: 'Base URL',
    model_name: 'Model Name',
    api_key_auth: 'API Key (Bearer Auth)',
    change_category: 'Change Category',
    regenerate: 'Regenerate',
    delete: 'Delete',
  },
  zh: {
    title: 'TabRack',
    search_placeholder: '搜索标签页或输入命令...',
    dedupe: '一键去重',
    memory_release: '释放内存',
    by_domain: '域名聚合',
    by_base_domain: '按二级域名',
    by_full_domain: '按完整域名',
    settings: '设置',
    settings_desc: '管理您的 TabRack 偏好设置。',
    language: '显示语言',
    language_desc: '界面显示的语言',
    system_default: '跟随系统 (System)',
    view_mode: '默认视图模式',
    view_mode_desc: '选择标签页列表的显示密度',
    group_mode: '默认聚合模式',
    group_mode_desc: '选择标签页的默认分组方式',
    auto_discard: '自动休眠超时',
    auto_discard_desc: '后台标签多长时间后自动释放内存',
    expanded: '宽松排版 (Expanded)',
    compact: '紧凑排版 (Compact)',
    done: '完成',
    cmd_palette: '全局命令面板',
    cmd_palette_desc: '用于随时唤起面板的快捷键',
    no_tabs: '抱歉，没有找到标签页',
    tabs_count: '个标签',
    active_tabs: '活跃',
    slept_tabs: '已休眠',
    all_tabs: '所有标签页',
    read_later: '稍后阅读',
    window: '窗口',
    close_all_tabs: '关闭所有标签页',
    close_duplicate_tabs: '关闭重复的标签页？',
    duplicate_tabs_desc: '个重复状态的标签页。请取消勾选你想保留的标签页。',
    we_found: '我们发现了',
    cancel: '取消',
    close_selected: '一键关闭选中的',
    switch_tab: '切换到该标签页',
    failed_to_save: '保存失败',
    keep_one_tab: '仅保留一个',
    closed_duplicates: '已清理 {count} 个重复标签页',
    closed_domain_tabs: '已从 {domain} 关闭了 {count} 个标签页',
    kept_one_tab_toast: '已在 {domain} 仅保留 1 个标签，清理了 {count} 个',
    memory_freed: '内存已释放。{active} 活跃，{slept} 休眠',
    dashboard_soon: '仪表盘功能即将推出...',
    saving_session: '正在保存会话...',
    discarding_tabs: '正在休眠不活跃的标签页...',
    preview_mode: ' (预览体验)',
    dedupe_requested: '已发起去重请求',
    reading_list_empty: '您的稍后阅读列表为空',
    summarize: '一键 AI 总结',
    no_duplicates: '太棒了，没有发现重复的标签页',
    ai_summary: 'AI 摘要',
    category: '分类',
    all_categories: '全部分类',
    uncategorized: '未分类',
    tech: '技术与开发',
    read: '阅读与资讯',
    tool: '工具与实用程序',
    work: '工作与文档',
    social: '社交与媒体',
    edit_categories: '编辑自定义分类',
    new_category: '新分类...',
    press_enter_to_add: '按下回车键添加。',
    ai_engine_config: 'AI Engine / 摘要引擎配置',
    provider: '提供商',
    gemini_nano: 'Google Gemini Nano (Chrome 本地)',
    gemini_cloud: 'Google Gemini Cloud (API)',
    custom_cloud: '自定义云端 (兼容 OpenAI)',
    gemini_api_key_desc: '可选：填入您自己的 Gemini API Key。若留空则尝试使用平台默认配置。',
    base_url: 'Base URL (接口地址)',
    model_name: 'Model Name (模型名称)',
    api_key_auth: 'API Key (鉴权密钥)',
    change_category: '修改分类',
    regenerate: '重新生成',
    delete: '删除',
  }
};

type Translations = typeof translations.en & {
  edit_categories?: string;
  new_category?: string;
  press_enter_to_add?: string;
  ai_engine_config?: string;
  provider?: string;
  gemini_nano?: string;
  gemini_cloud?: string;
  custom_cloud?: string;
  gemini_api_key_desc?: string;
  base_url?: string;
  model_name?: string;
  api_key_auth?: string;
  change_category?: string;
  regenerate?: string;
  delete?: string;
};
type TranslationKey = keyof Translations;

interface LanguageContextType {
  language: Language;
  resolvedLanguage: ResolvedLanguage;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'system',
  resolvedLanguage: 'en',
  setLanguage: () => {},
  t: (key) => translations.en[key]
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('tabrack-lang') as Language) || 'system';
  });
  
  const [resolvedLanguage, setResolvedLanguage] = useState<ResolvedLanguage>('en');

  useEffect(() => {
    if (language === 'system') {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('zh')) {
        setResolvedLanguage('zh');
      } else {
        setResolvedLanguage('en');
      }
    } else {
      setResolvedLanguage(language);
    }
  }, [language]);

  const changeLanguage = (lang: Language) => {
    localStorage.setItem('tabrack-lang', lang);
    setLanguage(lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[resolvedLanguage][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, resolvedLanguage, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
