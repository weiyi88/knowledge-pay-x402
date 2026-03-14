import { useState } from 'react';
import { ethers } from 'ethers';

/**
 * 钱包连接组件
 * 支持 MetaMask 等 EVM 钱包
 */
export default function WalletConnect({ onConnect, account }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connectWallet = async () => {
    setConnecting(true);
    setError(null);

    try {
      // 检查 MetaMask
      if (!window.ethereum) {
        throw new Error('请安装 MetaMask 钱包');
      }

      // 请求账户访问
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      // 创建 provider 和 signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const account = accounts[0];

      // 检查网络（GOAT Testnet3: 48816）
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      if (chainId !== 48816) {
        // 尝试切换到 GOAT Testnet3
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xbe50' }], // 48816 = 0xbe50
          });
        } catch (switchError) {
          // 网络不存在，添加网络
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xbe50',
              chainName: 'GOAT Testnet3',
              nativeCurrency: {
                name: 'BTC',
                symbol: 'BTC',
                decimals: 18,
              },
              rpcUrls: ['https://rpc.testnet3.goat.network'],
              blockExplorerUrls: ['https://explorer.testnet3.goat.network'],
            }],
          });
        }
      }

      onConnect(provider, signer, account);
    } catch (err) {
      console.error('Connect wallet error:', err);
      setError(err.message || '连接失败');
    } finally {
      setConnecting(false);
    }
  };

  if (account) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          padding: '8px 16px',
          borderRadius: '20px',
          color: 'white',
          fontSize: '14px',
        }}>
          🟢 {account.slice(0, 6)}...{account.slice(-4)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={connectWallet}
        disabled={connecting}
        style={{
          background: connecting ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: connecting ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
        }}
      >
        {connecting ? '连接中...' : '🦊 连接钱包'}
      </button>
      
      {error && (
        <p style={{
          color: '#ff6b6b',
          fontSize: '12px',
          marginTop: '8px',
          textAlign: 'right',
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
