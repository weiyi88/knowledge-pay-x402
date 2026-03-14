import { useState } from 'react';

/**
 * 提问组件
 * 用户选择 Agent 后支付 USDC 提问
 */
export default function AskQuestion({ selectedAgent, paymentHelper, account, onQuestionSubmitted }) {
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) {
      alert('请输入问题');
      return;
    }

    if (!selectedAgent) {
      alert('请选择 Agent');
      return;
    }

    if (!paymentHelper) {
      alert('请等待钱包初始化');
      return;
    }

    setSubmitting(true);
    setStatus({ type: 'info', message: '创建订单中...' });

    try {
      // 1. 创建问题订单
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          question: question.trim(),
          fromAddress: account,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '创建订单失败');
      }

      const order = await res.json();
      setStatus({ type: 'info', message: '请在钱包中确认支付...' });

      // 2. 如果有 calldata 签名请求，先签名
      if (order.calldataSignRequest) {
        const signature = await paymentHelper.signCalldata(order);
        await fetch(`/api/questions/${order.orderId}/signature`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signature }),
        });
      }

      // 3. 执行支付
      const result = await paymentHelper.pay(order);
      
      if (!result.success) {
        throw new Error(result.error || '支付失败');
      }

      setStatus({ type: 'success', message: '支付成功！等待确认...' });

      // 4. 轮询订单状态
      let confirmed = false;
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusRes = await fetch(`/api/questions/${order.orderId}`);
        const statusData = await statusRes.json();
        
        if (statusData.status === 'paid' || statusData.status === 'PAYMENT_CONFIRMED') {
          confirmed = true;
          break;
        }
      }

      if (confirmed) {
        setStatus({ 
          type: 'success', 
          message: '✅ 问题提交成功！Agent 将尽快回答' 
        });
        setQuestion('');
        onQuestionSubmitted();
        
        // 3 秒后清除状态
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus({ type: 'warning', message: '⚠️ 支付可能需要更长时间确认' });
      }

    } catch (error) {
      console.error('Submit question error:', error);
      setStatus({ type: 'error', message: `❌ ${error.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedAgent) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginTop: '24px',
        textAlign: 'center',
        color: '#999',
      }}>
        请先选择一个 Agent
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      marginTop: '24px',
    }}>
      <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>
        💬 向 {selectedAgent.name} 提问
      </h2>
      
      <div style={{
        background: '#f8f9fa',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <span style={{ color: '#666', fontSize: '14px' }}>
          价格：<strong style={{ color: '#28a745' }}>1 USDC</strong>
          {selectedAgent.reputation >= 800 && ' ⭐ (专家价)'}
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="写下你的问题..."
          rows={4}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />

        <button
          type="submit"
          disabled={submitting || !question.trim()}
          style={{
            width: '100%',
            background: submitting || !question.trim() ? '#ccc' : '#667eea',
            color: 'white',
            border: 'none',
            padding: '14px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: submitting || !question.trim() ? 'not-allowed' : 'pointer',
            marginTop: '12px',
          }}
        >
          {submitting ? '处理中...' : '💰 支付并提问'}
        </button>
      </form>

      {status && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '14px',
          background: status.type === 'success' ? '#d4edda' :
                     status.type === 'error' ? '#f8d7da' :
                     status.type === 'warning' ? '#fff3cd' : '#d1ecf1',
          color: status.type === 'success' ? '#155724' :
                 status.type === 'error' ? '#721c24' :
                 status.type === 'warning' ? '#856404' : '#0c5460',
        }}>
          {status.message}
        </div>
      )}
    </div>
  );
}
