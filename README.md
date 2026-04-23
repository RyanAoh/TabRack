<div align="center">

# 🗄️ TabRack

**A smart, local-first browser tab manager with AI categorization.**

[![English](https://img.shields.io/badge/Language-English-blue)](#english-documentation)
[![简体中文](https://img.shields.io/badge/Language-简体中文-red)](#中文文档)

</div>

---

<div id="english-documentation"></div>

# TabRack (English)

TabRack is a next-generation browser tab manager that helps you tame tab overload completely locally. With a clean interface, robust privacy features (no cloud sync required), and an intelligent AI categorization engine powered by Gemini Nano (Chrome built-in `window.ai`), it provides a blazing-fast experience to organize, discard, and read tabs later.

## ✨ Key Features

- **🌐 Smart Domain Grouping:** Instantly group chaotic tabs by their respective domains with one click.
- **✂️ Keep Exactly One Tab:** Too many repetitive searches? Quickly trim duplicate tabs of the same domain with a single click of the "scissors" icon, keeping only the most recently active one.
- **⚡ AI Categorize & Auto-Summary:** Hover over any tab to let Chrome's built-in local AI model (Gemini Nano) analyze its intent entirely offline. Furthermore, in your Read Later list, you can ask the AI to **generate a concise summary** of any saved article instantly!
- **🧹 Instant Deduplication Radar:** Automatically scans open tabs, stripping away tracking parameters (`utm_source`, etc.) to find true duplicates.
- **🔍 Live Search & Filter:** A powerful search bar to instantly find any tab by title or URL across all your open windows.
- **🎨 Dark/Light Mode & UI Density:** Fully supports system-level Dark Mode and lets you toggle between 'Compact' and 'Expanded' viewing densities.
- **🧠 Memory Release:** A built-in "Discard" feature forces inactive tabs to sleep, immediately freeing RAM.
- **📖 Read Later (Read & Burn):** Save tabs you don't have time for into a local IndexedDB list and automatically close them. Now features a **Double Interception Valve** with URL normalization to strip tracking parameters ensuring you never save exact duplicates. Clicking the extension icon in your browser toolbar or the Bookmark (`🔖`) icon on the tab instantly saves the current tab to Read Later and clears it out of your way.
- **⌨️ Command Palette:** Access essential functions from a unified Global Command Palette for a mouse-free, keyboard-first workflow.
- **🌍 Full i18n Support:** Fully translated interfaces in English and Simplified Chinese.

## 🚀 Usage Guide

1. **Top Action Bar:**
   - **One-Click Dedupe:** Click to scan for duplicate tabs and selectively close them.
   - **Release Memory:** Instantly puts all your inactive tabs into "sleep" mode to save RAM.
   - **Domain Grouping:** Toggle to switch between grouping tabs by "Window" or by "Domain".

2. **Managing Domain Groups (When Domain Grouping is ON):**
   - Hover over a domain group header to see quick actions.
   - Click the **red Trash icon** to close all tabs from that site.
   - Click the **Scissors icon** to intelligently auto-close all but the most relevant/most recent tab.

3. **Managing Individual Tabs:**
   - **Switch:** Click the external link icon to instantly jump to that tab.
   - **AI Categorize (⚡):** Click to let the local engine predict the context/category of the tab.
   - **Read Later (🔖):** Save the link to your offline reading list. **Pro Tip:** Pin the TabRack icon to your browser toolbar—clicking it will instantly send the current page to Read Later and close the tab!

4. **Settings (Settings Gear):** Configure viewing mode (Expanded or Compact) and UI language mappings.

---
</div>

<div id="中文文档" style="margin-top: 50px;"></div>

# TabRack (简体中文)

TabRack 是一款下一代浏览器标签页管理器，专为解决“标签页灾难”而生。它采用 **Local-First (本地优先)** 的原则构建，绝不向云端发送您的浏览记录。同时，它前沿地集成了 Chrome 浏览器即将全面内置的端侧大模型接口 (`window.ai` / Gemini Nano)，为您提供极速的网页智能归类与清理体验。

## ✨ 核心特性

- **🌐 域名智能聚合：** 一键开启按域名 (Domain) 聚合模式，立刻将散落各处的相似网页整理打包。
- **✂️ 精确“仅保留一个”：** 查资料时同网站页面开了几十个？在域名分组标题栏点击“小剪刀”图标，系统会利用算法（活跃状态 > 未休眠 > 创建时间）智能挑选出最优标签留下，其余瞬间斩断。
- **⚡ AI 智能分类与全文摘要：** 鼠标悬停可调用本地 AI 为网页判定分类；在“稍后阅读”列表中，您甚至可以直接让本地大模型为您**生成长文的智能摘要**！
- **🧹 一键去重雷达：** 自动跨窗口扫描重复打开的网页，底层拥有强大的洗链功能，能无视 `utm` 等追踪后缀，找出真正的重复项。
- **🔍 极速全局搜索：** 顶部的全局搜索框支持模糊匹配跨所有窗口的网页标题和 URL。
- **🎨 暗视野模式与排版密度：** 完美支持系统的 深色/浅色 模式切换，并支持在设置中更改紧凑或宽松的列表 UI 间距。
- **🧠 强制释放内存：** “释放内存”功能可瞬间让所有在后台装死的标签页强制进入休眠状态，拯救你的设备运存。
- **📖 稍后阅读 (阅后即焚 & 严格去重)：** 遇到长文？直接点击右上角的 TabRack 扩展图标，或者在控制台点击书签 (`🔖`) 图标，当前页面立刻存入你本地的 IndexedDB 数据库并自动关闭。内置了 **URL 深度清洗与双重去重拦截**，绝不存重复文章，再次添加只会静默刷新你的存入时间。
- **⌨️ 全局命令面板：** 通过快捷指令面板调出系统动作，满足键盘党高效率操作。
- **🌍 国际化支持：** 完善的中英双语深度适配，包含所有弹窗及交互反馈。

## 🚀 使用指南

1. **顶部核心操作栏：**
   - **一键去重：** 点击即可唤出去重面板，全景审视并勾选关闭重复页面。
   - **释放内存：** 立刻休眠非活动窗口，快速抢救电脑内存。
   - **域名聚合：** 切换“按所在窗口”或“按域名属性”来重组标签页列表视角。

2. **聚合领域管理 (当开启域名聚合时)：**
   - 鼠标悬停在聚合面板标题栏右侧。
   - 点击 **红色垃圾桶**：秒杀当前网站的所有标签页。
   - 点击 **小剪刀**：清理组内多余标签，系统懂事地帮你只“保留一个”最佳候选人。

3. **单标签极速交互：**
   - **跳转：** 点击对应箭头图标，跨窗口直接切走。
   - **AI 智能分类 (⚡)：** 让本地 AI 引擎预判该网页所属版块。
   - **稍后阅读 (🔖)：** 保存网页同时立刻关闭当前选项卡。**高阶用法：** 固定 TabRack 图标到浏览器右上角，冲浪时遇到来不及看的网页，直接痛快地点击图标，文章立马收纳并自动关掉网页！

4. **个性化设置：** 右上角齿轮图标，支持排版密度（宽松/紧凑排版）与应用语言切换设置。

---
</div>

> **Note / 注意**: AI Categorization currently falls back to a smart mock engine containing keywords matching inside standard browser environments unless the experimental `#prompt-api-for-gemini-nano` flag is enabled via Chrome flags. / 目前在标准浏览器中，由于 Chrome 原生端大模型实验还未完全开放，AI 分类降级使用了一套本地全真模拟语义引擎，直至您的浏览器正式获得该能力支持。
