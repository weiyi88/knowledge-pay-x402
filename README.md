# Knowledge Pay x402 - 付费问答平台

基于 GoatX402 协议的链上付费问答系统，结合 ERC-8004 Agent 身份认证。

## 🚀 功能特性

- **x402 支付** - 用户支付 USDC/USDT 提问
- **Agent 链上身份** - 每个回答者有唯一的链上身份 ID
- **信誉系统** - Agent 信誉分数影响服务价格和抽成
- **实时演示** - 完整的前后端 + 智能合约

## 📁 项目结构

```
knowledge-pay-x402/
├── contracts/          # Solidity 智能合约
├── backend/            # Express 后端 + x402 集成
├── frontend/           # React + Vite 前端
└── scripts/            # 部署脚本
```

## 🛠️ 快速开始

### 1. 配置环境变量

```bash
# 后端 .env
cd backend
cp .env.example .env
# 编辑 .env 填入你的 GoatX402 credentials
```

### 2. 安装依赖

```bash
# 后端
cd backend && pnpm install

# 前端
cd frontend && pnpm install

# 合约
cd contracts && forge install
```

### 3. 启动服务

```bash
# 启动后端
cd backend && pnpm dev

# 启动前端（新终端）
cd frontend && pnpm dev
```

### 4. 访问应用

打开 http://localhost:5173 连接钱包开始使用

## 🔑 核心流程

1. 用户连接钱包
2. 选择 Agent 并提问
3. 支付 USDC/USDT（通过 x402）
4. Agent 回答问题
5. 累积信誉分数

## 📄 许可证

MIT
