/**
 * Knowledge Pay x402 Backend
 * 
 * 功能：
 * - x402 支付订单创建和管理
 * - Agent 信誉管理
 * - 问题/回答存储
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoatX402Client } = require('goatx402-sdk-server');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 初始化 x402 客户端
const x402Client = new GoatX402Client({
    baseUrl: process.env.GOATX402_API_URL,
    apiKey: process.env.GOATX402_API_KEY,
    apiSecret: process.env.GOATX402_API_SECRET,
});

// 内存数据库（演示用，生产环境请用真实数据库）
const db = {
    questions: new Map(),
    answers: new Map(),
    agents: new Map(),
};

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 获取配置
app.get('/api/config', async (req, res) => {
    try {
        const config = {
            merchantId: process.env.GOATX402_MERCHANT_ID,
            apiUrl: process.env.GOATX402_API_URL,
            contractAddress: process.env.AGENT_IDENTITY_CONTRACT,
        };
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 创建问题订单
 * POST /api/questions
 * 
 * Body:
 * {
 *   agentId: number,
 *   question: string,
 *   fromAddress: string
 * }
 */
app.post('/api/questions', async (req, res) => {
    try {
        const { agentId, question, fromAddress } = req.body;
        
        if (!agentId || !question || !fromAddress) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 创建 x402 订单（1 USDC = 1000000 wei for 6 decimals）
        const order = await x402Client.createOrder({
            dappOrderId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            chainId: 48816, // GOAT Testnet3
            tokenSymbol: 'USDC',
            tokenContract: '0x29d1ee93e9ecf6e50f309f498e40a6b42d352fa1',
            fromAddress: fromAddress,
            amountWei: '1000000', // 1 USDC
        });

        // 存储问题（待支付）
        const questionData = {
            id: order.orderId,
            agentId,
            question,
            fromAddress,
            status: 'pending_payment',
            orderId: order.orderId,
            createdAt: new Date().toISOString(),
        };
        
        db.questions.set(order.orderId, questionData);

        res.json({
            orderId: order.orderId,
            flow: order.flow,
            payToAddress: order.payToAddress,
            amount: order.amountWei,
            question: questionData,
        });
    } catch (error) {
        console.error('Create question error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 查询订单状态
 * GET /api/questions/:orderId
 */
app.get('/api/questions/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const question = db.questions.get(orderId);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // 从 x402 获取订单状态
        const orderStatus = await x402Client.getOrderStatus(orderId);
        
        question.status = orderStatus.status;
        question.txHash = orderStatus.txHash;
        
        if (orderStatus.status === 'PAYMENT_CONFIRMED') {
            question.status = 'paid';
            question.paidAt = new Date().toISOString();
        }

        db.questions.set(orderId, question);
        res.json(question);
    } catch (error) {
        console.error('Get question error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 提交回答
 * POST /api/answers
 * 
 * Body:
 * {
 *   questionId: string,
 *   answer: string,
 *   agentAddress: string
 * }
 */
app.post('/api/answers', async (req, res) => {
    try {
        const { questionId, answer, agentAddress } = req.body;
        
        if (!questionId || !answer || !agentAddress) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const question = db.questions.get(questionId);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        if (question.status !== 'paid') {
            return res.status(400).json({ error: 'Question not paid yet' });
        }

        // 创建回答
        const answerData = {
            id: `a_${Date.now()}`,
            questionId,
            agentAddress,
            answer,
            createdAt: new Date().toISOString(),
        };

        db.answers.set(answerData.id, answerData);
        question.answerId = answerData.id;
        question.status = 'answered';
        db.questions.set(questionId, question);

        res.json({
            success: true,
            answer: answerData,
        });
    } catch (error) {
        console.error('Submit answer error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 获取所有问题
 * GET /api/questions
 */
app.get('/api/questions', (req, res) => {
    const questions = Array.from(db.questions.values());
    res.json(questions);
});

/**
 * 获取 Agent 的问题列表
 * GET /api/agents/:agentId/questions
 */
app.get('/api/agents/:agentId/questions', (req, res) => {
    const { agentId } = req.params;
    const questions = Array.from(db.questions.values())
        .filter(q => q.agentId === parseInt(agentId));
    res.json(questions);
});

/**
 * 获取回答
 * GET /api/answers/:answerId
 */
app.get('/api/answers/:answerId', (req, res) => {
    const { answerId } = req.params;
    const answer = db.answers.get(answerId);
    
    if (!answer) {
        return res.status(404).json({ error: 'Answer not found' });
    }
    
    res.json(answer);
});

/**
 * 注册 Agent（演示用，实际应该调用链上合约）
 * POST /api/agents
 */
app.post('/api/agents', (req, res) => {
    const { name, description, address } = req.body;
    
    const agentId = db.agents.size + 1;
    const agent = {
        id: agentId,
        name,
        description,
        address,
        reputation: 500,
        totalQuestions: 0,
        totalEarnings: 0,
        active: true,
        createdAt: new Date().toISOString(),
    };
    
    db.agents.set(agentId, agent);
    
    res.json({ success: true, agent });
});

/**
 * 获取所有 Agent
 * GET /api/agents
 */
app.get('/api/agents', (req, res) => {
    const agents = Array.from(db.agents.values());
    res.json(agents);
});

/**
 * 获取单个 Agent
 * GET /api/agents/:id
 */
app.get('/api/agents/:id', (req, res) => {
    const { id } = req.params;
    const agent = db.agents.get(parseInt(id));
    
    if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json(agent);
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 Knowledge Pay Backend running on port ${PORT}`);
    console.log(`📍 Health: http://localhost:${PORT}/api/health`);
    console.log(`📍 Config: http://localhost:${PORT}/api/config`);
});
