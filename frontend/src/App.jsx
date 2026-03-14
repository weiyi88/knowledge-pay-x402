import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { PaymentHelper } from 'goatx402-sdk';

// 组件
import WalletConnect from './components/WalletConnect';
import AskQuestion from './components/AskQuestion';
import AgentProfile from './components/AgentProfile';

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [paymentHelper, setPaymentHelper] = useState(null);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [questions, setQuestions] = useState([]);

  // 连接钱包后初始化
  const handleConnect = async (walletProvider, walletSigner, walletAccount) => {
    setProvider(walletProvider);
    setSigner(walletSigner);
    setAccount(walletAccount);
    
    // 初始化 x402 支付助手
    const payment = new PaymentHelper(walletSigner);
    setPaymentHelper(payment);
    
    // 加载 Agent 列表
    loadAgents();
  };

  // 加载 Agent 列表
  const loadAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data);
      
      // 默认选择第一个 Agent
      if (data.length > 0 && !selectedAgent) {
        setSelectedAgent(data[0]);
      }
    } catch (error) {
      console.error('Load agents error:', error);
    }
  };

  // 加载问题列表
  const loadQuestions = async () => {
    try {
      const res = await fetch('/api/questions');
      const data = await res.json();
      setQuestions(data);
    } catch (error) {
      console.error('Load questions error:', error);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      padding: '20px',
    }}>
      {/* 头部 */}
      <header style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px',
      }}>
        <div>
          <h1 style={{
            color: 'white',
            fontSize: '32px',
            fontWeight: 'bold',
          }}>
            🐐 Knowledge Pay x402
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            marginTop: '8px',
          }}>
            链上付费问答 · Agent 身份认证
          </p>
        </div>
        
        <WalletConnect onConnect={handleConnect} account={account} />
      </header>

      {/* 主内容 */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {!account ? (
          // 未连接钱包
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '60px 40px',
            textAlign: 'center',
          }}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
              👋 欢迎使用 Knowledge Pay
            </h2>
            <p style={{ color: '#666', marginBottom: '32px' }}>
              连接钱包开始提问或成为 Agent 回答问题
            </p>
            <div style={{
              display: 'flex',
              gap: '20px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <FeatureCard
                icon="💬"
                title="提问"
                desc="支付 USDC 向专家提问"
              />
              <FeatureCard
                icon="🎓"
                title="回答"
                desc="成为 Agent 赚取收益"
              />
              <FeatureCard
                icon="🏆"
                title="信誉"
                desc="建立链上声誉系统"
              />
            </div>
          </div>
        ) : (
          // 已连接钱包
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
          }}>
            {/* 左侧：选择 Agent + 提问 */}
            <div>
              <AgentProfile
                agents={agents}
                selectedAgent={selectedAgent}
                onSelectAgent={setSelectedAgent}
              />
              
              <AskQuestion
                selectedAgent={selectedAgent}
                paymentHelper={paymentHelper}
                account={account}
                onQuestionSubmitted={loadQuestions}
              />
            </div>

            {/* 右侧：问题列表 */}
            <div>
              <QuestionsList questions={questions} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// 功能卡片组件
function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{
      background: '#f8f9fa',
      borderRadius: '12px',
      padding: '24px',
      width: '200px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>{icon}</div>
      <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{title}</h3>
      <p style={{ color: '#666', fontSize: '14px' }}>{desc}</p>
    </div>
  );
}

// 问题列表组件
function QuestionsList({ questions }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
    }}>
      <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>
        📋 问题列表
      </h2>
      
      {questions.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '40px' }}>
          暂无问题
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      )}
    </div>
  );
}

// 单个问题卡片
function QuestionCard({ question }) {
  const statusColors = {
    pending_payment: '#ffc107',
    paid: '#28a745',
    answered: '#007bff',
  };

  const statusTexts = {
    pending_payment: '待支付',
    paid: '已支付',
    answered: '已回答',
  };

  return (
    <div style={{
      border: '1px solid #e9ecef',
      borderRadius: '12px',
      padding: '16px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <span style={{
          background: statusColors[question.status] || '#6c757d',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
        }}>
          {statusTexts[question.status] || question.status}
        </span>
        <span style={{ color: '#999', fontSize: '12px' }}>
          {new Date(question.createdAt).toLocaleString('zh-CN')}
        </span>
      </div>
      <p style={{ fontSize: '14px', marginBottom: '8px' }}>
        {question.question}
      </p>
      {question.answerId && (
        <div style={{
          background: '#f8f9fa',
          padding: '12px',
          borderRadius: '8px',
          marginTop: '8px',
        }}>
          <strong>回答：</strong>
          <p style={{ fontSize: '14px', marginTop: '4px' }}>
            已回答（查看完整内容...）
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
