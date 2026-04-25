<div align="center">

# TabRack

**A smart browser tab manager featuring domain grouping, read-later archiving, and AI tracking & summarization.**

[![English](https://img.shields.io/badge/Language-English-blue)](#english-documentation)
[![简体中文](https://img.shields.io/badge/Language-简体中文-red)](#中文文档)

<br/>
<img src="./screenshot.png" alt="TabRack Screenshot" width="800" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
<br/>

</div>

---

<div id="english-documentation"></div>

# TabRack (English)

TabRack is a next-generation browser tab manager that helps you tame tab overload with robust privacy. With a clean interface, local data storage (no mandatory cloud sync), and an intelligent AI categorization & summarization engine powered by your choice of local AI (Gemini Nano) or Cloud API (Gemini/OpenAI), it provides a blazing-fast experience to organize, discard, and read tabs later.

## ✨ Key Features

### Tab Management

- **🌐 Smart Domain Grouping:** Toggle between 3 grouping modes — by **Window** (default), by **Base Domain** (e.g., `google.com`), or by **Full Domain** (e.g., `mail.google.com`). Uses heuristic matching for ccTLDs like `.co.uk`.
- **✂️ Keep Exactly One Tab:** Too many repetitive searches? Click the "Scissors" icon on a domain group header to intelligently trim duplicate tabs, keeping only the best candidate (priority: active > not discarded > newest).
- **🗑️ Close All Domain Tabs:** Click the red Trash icon on a domain group header to instantly close every tab from that site.
- **🧹 Instant Deduplication Radar:** The "Dedup" button scans all open tabs, stripping tracking parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `ref`, `source`, and trailing slashes) to find true URL duplicates. A dialog lets you selectively close duplicates with checkbox selection.
- **🔍 Live Search & Filter:** A powerful search bar to instantly find any tab by title or URL across all open windows.
- **🧠 Memory Release:** The "Zap" button forces all inactive non-discarded tabs into Chrome's "discarded" (sleep) state, immediately freeing RAM.

### Read Later

- **📖 Save & Close:** Click the Bookmark (`🔖`) icon on any tab, or click the TabRack toolbar icon to save the current page to your local IndexedDB and automatically close it.
- **🏷️ Category System:** Assign categories when saving — 6 built-in categories (Tech, Read, Tool, Work, Social, Uncategorized) plus the ability to add custom categories. A filter bar shows item counts per category.
- **📊 Scroll Position Tracking:** Your reading progress is captured when saving — a progress bar on each Read Later item shows how far you've read.
- **🛡️ Double Dedup:** URL normalization strips tracking parameters before saving, ensuring you never store duplicates. Re-adding the same page silently updates the timestamp.

### AI Summarization

- **⚡ AI Auto-Summary:** Click the Sparkles icon on any open tab or Read Later item to generate an AI summary. Summaries are cached in IndexedDB and can be regenerated with a refresh button.
- **🔧 4-Tier AI Engine Fallback:**
  1. **Gemini Nano (Local)** — Uses Chrome's built-in `window.ai.textModel` API. Requires the `#prompt-api-for-gemini-nano` Chrome flag.
  2. **Gemini Cloud API** — Uses `@google/genai` SDK with model `gemini-3-flash-preview`. Requires an API key (configurable in Settings or via `GEMINI_API_KEY` env var).
  3. **Custom Cloud (OpenAI-compatible)** — Send requests to any OpenAI-compatible API endpoint with a configurable base URL, API key, and model name.
  4. **Mock Fallback** — Extracts the first 2 sentences from page content, or generates heuristic URL-based summaries for known sites (GitHub, YouTube, news, etc.). Used when no AI backend is available.

## 🚀 Usage Guide

1. **Top Action Bar:**
   - **One-Click Dedupe:** Click to scan for duplicate tabs and selectively close them via a checkbox dialog.
   - **Release Memory:** Instantly puts all your inactive tabs into "sleep" mode to save RAM.
   - **Domain Grouping:** Toggle between 3 modes — group by "Window", "Base Domain", or "Full Domain".

2. **Managing Domain Groups (When Domain Grouping is ON):**
   - Hover over a domain group header to see quick actions.
   - Click the **red Trash icon** to close all tabs from that site.
   - Click the **Scissors icon** to intelligently auto-close all but the most relevant/most recent tab.

3. **Managing Individual Tabs:**
   - **Switch:** Click the external link icon to instantly jump to that tab (even across windows).
   - **AI Summary:** Click the Sparkles icon to let the configured AI engine generate a summary of the tab content.
   - **Read Later:** Save the link to your offline reading list. A dropdown lets you assign a category at save time.
   - **Pro Tip:** Pin the TabRack icon to your browser toolbar — clicking it will instantly send the current page to Read Later and close the tab!

4. **Read Later Panel:**
   - Switch to the "Read Later" tab to view all saved articles.
   - Use the category filter bar to browse by category (shows item counts).
   - Each item shows: favicon, title, URL, scroll progress bar, category selector, summarize button, and delete button.
   - Click Sparkles to generate an AI summary, with a regenerate button for updates.

5. **Settings Dialog:**
   - **Language:** Switch between English and Chinese.
   - **View Mode:** Toggle between Compact and Expanded tab display.
   - **Group Mode:** Set default domain grouping mode.
   - **Custom Categories:** Add or remove categories beyond the 6 built-in ones.
   - **Data Backup:** Export or import your Read Later data and categories as JSON.
   - **AI Engine:** Choose your AI provider (Gemini Nano / Gemini Cloud / Custom Cloud), enter API keys, configure base URL and model name.

## 📥 Install from Releases (Easiest)

1. Go to the [Releases](../../releases) page of this repository.
2. Download the latest `tabrack-extension.zip` file attached to the release.
3. Extract the downloaded `.zip` file to a folder on your computer.
4. Open your browser and navigate to the extensions page (e.g., `chrome://extensions`).
5. Enable **Developer mode** in the top right corner.
6. Click the **"Load unpacked"** button in the top left and select the folder you just extracted.
7. Pin TabRack to your toolbar and enjoy!

## 📦 Build & Load Extension Locally

**Prerequisites:** Ensure you have [Node.js](https://nodejs.org/) and `npm` installed on your machine.

1. **Install dependencies & build the project:**
   Run the following commands in your terminal to install required packages and build the extension.
   ```bash
   npm install
   npm run build
   ```
2. **Load into Chrome/Edge/Brave:**
   - Open your browser and navigate to the extensions page (e.g., `chrome://extensions`).
   - Enable **Developer mode** in the top right corner.
   - Click the **"Load unpacked"** button in the top left.
   - Select the `dist` folder generated from the build step located in the project's root directory.
3. **Pin and Use:**
   - Pin TabRack to your toolbar. Clicking it will save the current tab to Read Later! TabRack will also act as your default "New Tab" page, giving you an immersive full-screen management center.

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start dev server on http://localhost:3000
npm run dev

# Type checking
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

> **Note:** In dev mode (outside the Chrome extension context), the app provides mock tab data so you can develop and test the UI without loading the extension.

## 🔧 Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **TypeScript 5.8** | Type-safe development |
| **Vite 6** | Build tool & dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **shadcn/ui** | UI component library |
| **Dexie 4** | IndexedDB wrapper (Read Later, Summaries) |
| **@google/genai** | Gemini Cloud API integration |
| **Lucide React** | Icon library |
| **Sonner** | Toast notifications |
| **Framer Motion** | Animations |

## 🔐 Permissions

| Permission | Purpose |
|---|---|
| `tabs` | Query, create, remove, update, and discard tabs across windows |
| `storage` | Sync Read Later queue and categories between background and UI |
| `sidePanel` | Register the Side Panel view |
| `tabGroups` | Access Chrome tab group functionality |
| `windows` | Focus windows when switching to a tab in a different window |
| `scripting` | Read page content for AI summarization via `chrome.scripting.executeScript` |
| `<all_urls>` | Content script injection on all pages for scroll tracking and summarization |

---

<div id="中文文档" style="margin-top: 50px;"></div>

# TabRack (简体中文)

TabRack 是一款下一代浏览器标签页管理器，专为解决"标签页灾难"而生。它采用保护隐私的设计原则构建，绝不强制向云端同步您的浏览记录。同时，它不仅前沿地集成了 Chrome 浏览器即将全面内置的端侧大模型接口 (`window.ai` / Gemini Nano)，还在设置里支持了各种主流云端大模型（Gemini API / 兼容 OpenAI 格式 API）的选择，为您提供极速的网页智能归类、长文一键总结与空间清理体验。

## ✨ 核心特性

### 标签页管理

- **🌐 域名智能聚合：** 支持三种聚合模式 —— **按窗口**（默认）、**按基础域名**（如 `google.com`）、**按完整域名**（如 `mail.google.com`）。内置 ccTLD 启发式匹配，正确处理 `.co.uk` 等特殊后缀。
- **✂️ 精确"仅保留一个"：** 在域名分组标题栏点击"小剪刀"图标，系统会智能挑选出最优标签留下（优先级：活跃状态 > 未休眠 > 创建时间），其余瞬间斩断。
- **🗑️ 秒杀域名全组：** 点击域名分组标题栏的红色垃圾桶图标，瞬间关闭该网站的所有标签页。
- **🧹 一键去重雷达：** "去重"按钮跨窗口扫描重复打开的网页，底层拥有强大的洗链功能，能无视 `utm_source`、`utm_medium`、`utm_campaign`、`utm_term`、`utm_content`、`ref`、`source` 等追踪后缀及尾部斜杠，找出真正的重复项，并以勾选对话框让你精确选择关闭哪些。
- **🔍 极速全局搜索：** 顶部的全局搜索框支持模糊匹配跨所有窗口的网页标题和 URL。
- **🧠 强制释放内存：** "释放内存"功能可瞬间让所有在后台装死的标签页强制进入休眠状态，拯救你的设备运存。

### 稍后阅读

- **📖 保存并关闭：** 点击标签页上的书签 (`🔖`) 图标，或直接点击浏览器工具栏的 TabRack 图标，当前页面立刻存入本地 IndexedDB 并自动关闭。
- **🏷️ 分类系统：** 保存时可指定分类 —— 6 个内置分类（Tech、Read、Tool、Work、Social、Uncategorized）并支持添加自定义分类。分类过滤栏显示各类目的文章数量。
- **📊 滚动位置追踪：** 保存时自动记录阅读进度，每个稍后阅读条目显示进度条，一目了然你读到了哪里。
- **🛡️ 双重去重拦截：** 保存前自动清洗 URL 追踪参数，绝不存重复文章。再次添加相同页面只会静默刷新存入时间。

### AI 智能摘要

- **⚡ AI 一键摘要：** 点击标签页或稍后阅读条目上的 Sparkles 图标，即可生成 AI 摘要。摘要缓存在 IndexedDB 中，可随时点击刷新按钮重新生成。
- **🔧 四级 AI 引擎降级策略：**
  1. **Gemini Nano（本地端侧）** — 使用 Chrome 内置的 `window.ai.textModel` API。需在 Chrome Flags 中启用 `#prompt-api-for-gemini-nano`。
  2. **Gemini 云端 API** — 使用 `@google/genai` SDK，模型为 `gemini-3-flash-preview`。需配置 API Key（可在设置中填写或通过 `GEMINI_API_KEY` 环境变量提供）。
  3. **自定义云端（兼容 OpenAI 格式）** — 可发送请求至任意兼容 OpenAI 格式的 API 端点，支持自定义 Base URL、API Key 和模型名称。
  4. **Mock 降级引擎** — 提取网页内容前两句，或针对已知站点（GitHub、YouTube、新闻等）生成启发式摘要。当无 AI 后端可用时自动启用。


## 🚀 使用指南

1. **顶部核心操作栏：**
   - **一键去重：** 点击即可唤出去重面板，全景审视并勾选关闭重复页面。
   - **释放内存：** 立刻休眠所有非活动标签页，快速抢救电脑内存。
   - **域名聚合：** 切换三种模式 —— "按窗口"、"按基础域名" 或 "按完整域名" 来重组标签页列表视角。

2. **聚合领域管理 (当开启域名聚合时)：**
   - 鼠标悬停在聚合面板标题栏右侧。
   - 点击 **红色垃圾桶**：秒杀当前网站的所有标签页。
   - 点击 **小剪刀**：清理组内多余标签，系统懂事地帮你只"保留一个"最佳候选人。

3. **单标签极速交互：**
   - **跳转：** 点击对应箭头图标，跨窗口直接切走。
   - **AI 智能摘要：** 点击 Sparkles 图标，让配置的 AI 引擎提取该网页的核心要点和摘要。
   - **稍后阅读：** 保存网页同时立刻关闭当前选项卡。保存时可通过下拉菜单选择分类。
   - **高阶用法：** 固定 TabRack 图标到浏览器右上角，冲浪时遇到来不及看的网页，直接痛快地点击图标，文章立马收纳并自动关掉网页！

4. **稍后阅读面板：**
   - 切换到"稍后阅读"标签页查看所有已保存的文章。
   - 使用分类过滤栏按类别浏览（显示各类目数量）。
   - 每个条目显示：网站图标、标题、URL、阅读进度条、分类选择器、摘要按钮和删除按钮。
   - 点击 Sparkles 图标生成 AI 摘要，支持刷新重新生成。

5. **设置对话框：**
   - **语言：** 切换中文/英文界面。
   - **视图模式：** 切换紧凑/展开两种标签页显示方式。
   - **聚合模式：** 设置默认的域名聚合模式。
   - **自定义分类：** 在 6 个内置分类之外添加或移除自定义分类。
   - **数据备份：** 将稍后阅读数据和分类导出为 JSON，或从备份文件导入恢复。
   - **AI 引擎：** 选择 AI 提供商（Gemini Nano / Gemini 云端 / 自定义云端），填写 API Key，配置 Base URL 和模型名称。

## 📥 从 Release 下载安装 (最推荐)

1. 前往本仓库的 [Releases 发布页](../../releases)。
2. 下载最新版本下附带的 `tabrack-extension.zip` 压缩包。
3. 将下载的压缩包解压到您电脑上的任意文件夹中（请不要删除该解压后的文件夹）。
4. 在浏览器地址栏输入 `chrome://extensions` 打开扩展程序管理页面。
5. 开启页面右上角的 **开发者模式 (Developer mode)**。
6. 点击左上角的 **加载已解压的扩展程序 (Load unpacked)**，然后选择您刚刚解压的那个文件夹目录。
7. 在浏览器工具栏固定 TabRack，即可开始使用！

## 📦 自行打包与安装 (Chrome 扩展)

**环境依赖：** 请确保您的系统已安装 [Node.js](https://nodejs.org/) 与 `npm`。

1. **安装依赖并打包构建：**
   在项目根目录下打开终端，依次运行以下命令安装所需依赖项并进行打包：
   ```bash
   npm install
   npm run build
   ```
2. **加载到浏览器 (Chrome/Edge 等)：**
   - 在浏览器地址栏输入 `chrome://extensions` 打开扩展程序管理页面。
   - 开启页面右上角的 **开发者模式 (Developer mode)**。
   - 点击左上角的 **加载已解压的扩展程序 (Load unpacked)**。
   - 选择项目目录下刚刚构建生成的 `dist` 文件夹（它包含了浏览器所需的 manifest 与静态资源）。
3. **固定并使用：**
   - 极度建议在浏览器工具栏处固定 TabRack 图标。遇到稍长来不及看的文章只需点击一下扩展图标，当前页面即可被一键收录进"稍后阅读"并自动关闭释放内存！同时它也会接管您的"新建标签页 (New Tab)"以提供沉浸式的全屏管理体验。

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 启动开发服务器 http://localhost:3000
npm run dev

# 类型检查
npm run lint

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

> **提示：** 在开发模式下（非 Chrome 扩展环境），应用会提供模拟标签页数据，无需加载扩展即可开发和测试 UI。

## 🔧 技术栈

| 技术 | 用途 |
|---|---|
| **React 19** | UI 框架 |
| **TypeScript 5.8** | 类型安全开发 |
| **Vite 6** | 构建工具与开发服务器 |
| **Tailwind CSS 4** | 原子化 CSS 框架 |
| **shadcn/ui** | UI 组件库 |
| **Dexie 4** | IndexedDB 封装（稍后阅读、摘要缓存） |
| **@google/genai** | Gemini 云端 API 集成 |
| **Lucide React** | 图标库 |
| **Sonner** | Toast 通知 |
| **Framer Motion** | 动画效果 |

## 🔐 权限说明

| 权限 | 用途 |
|---|---|
| `tabs` | 跨窗口查询、创建、关闭、更新和休眠标签页 |
| `storage` | 在后台脚本与 UI 之间同步稍后阅读队列和分类数据 |
| `sidePanel` | 注册侧边栏视图 |
| `tabGroups` | 访问 Chrome 标签页分组功能 |
| `windows` | 切换到其他窗口的标签页时聚焦该窗口 |
| `scripting` | 通过 `chrome.scripting.executeScript` 读取页面内容以供 AI 摘要 |
| `<all_urls>` | 在所有页面注入内容脚本以追踪滚动位置和提取摘要内容 |

---

> **Note / 注意**: When "Gemini Nano (Local Chrome)" is selected, AI Summarization currently falls back to a smart mock engine containing keywords matching inside standard browser environments unless the experimental `#prompt-api-for-gemini-nano` flag is enabled via Chrome flags. Use the Cloud API options in settings for immediate access in any browser. / 当选择"Gemini Nano（本地端侧模式）"时，若标准浏览器的 Chrome 原生大模型实验 Flag 未开启，AI 摘要会暂时降级使用一套本地全真模拟语义引擎。您可以随时在设置中切换为"云端 API (Cloud API)"模型以在任何浏览器获得立刻的满血体验。