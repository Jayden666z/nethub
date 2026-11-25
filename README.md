# NetHub (`nethub.best`)

独立从零构建的跨端响应式网络工具、VPS 与机场目录站点，面向 **Cloudflare Pages** 部署，公开目录数据自动同步自 [huarun.win](https://huarun.win/)。

## 核心特性

- **三大目录栏目**：
  - **应用目录**：客户端、服务端、订阅工具、规则与配置，支持按平台、内核、代码状态、费用实时筛选。
  - **VPS 套餐**：支持按服务商、计费周期筛选，按折算月价 / 内存 / 流量排序。
  - **机场导航**：支持按价格区间筛选，按参考价 / 月流量排序，查看详细套餐与社区入口。
- **实时详情边缘代理（Cloudflare Pages Functions）**：
  - 列表页由构建时同步生成的静态 JSON（`public/data/*.json`）提供，极速加载。
  - 详情页通过 [`functions/api/detail.js`](functions/api/detail.js) 按白名单路径拉取并解析实时详情，结合 Cloudflare Edge Cache 自动缓存。
- **响应式与移动端体验**：
  - 浅色 / 深色双主题切换（自动记忆并遵循系统偏好）。
  - 桌面端顶部悬浮玻璃导航 + `/` 快捷搜索；移动端底部导航栏 + 底部筛选抽屉 + 全面屏安全区适配。

## 本地开发

```bash
# 安装依赖
npm install

# 从 huarun.win 同步最新目录数据到 public/data/
npm run sync

# 启动本地开发服务器（内置 /api/detail 代理中间件）
npm run dev

# 生产构建（含数据同步）
npm run build:fresh
```

## 部署到 Cloudflare Pages 并绑定 `nethub.best`

### 方式一：Cloudflare Dashboard 直接关联 GitHub（最简单）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 选择仓库 `Jayden666z/nethub`，填写构建配置：
   - **Production branch**: `main`
   - **Build command**: `npm run build:fresh`
   - **Build output directory**: `dist`
   - **Node version**（环境变量）：`NODE_VERSION` = `22`
3. 点击 **Save and Deploy**（Cloudflare Pages 会自动识别 `functions/api/detail.js`、`public/_redirects` 和 `public/_headers`）。
4. 部署完成后，进入该 Pages 项目的 **Custom domains** → **Set up a custom domain** → 输入 `nethub.best`（及可选 `www.nethub.best`）并按提示完成 DNS 解析与 HTTPS 证书签发。

### 方式二：GitHub Actions 每日定时自动同步并部署

仓库已内置 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，每天自动同步最新数据并发布到 Cloudflare Pages。只需在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加两个 Secrets：

- `CLOUDFLARE_API_TOKEN`（需拥有 Cloudflare Pages: Edit 权限）
- `CLOUDFLARE_ACCOUNT_ID`（Cloudflare 账号 ID）

## 数据声明

本项目代码为全新独立实现，遵循 MIT 许可。展示的应用、VPS 与机场公开目录数据来源于 [huarun.win](https://huarun.win/)，详情页均保留原始资料页入口。
