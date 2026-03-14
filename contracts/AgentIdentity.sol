// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AgentIdentity
 * @dev ERC-8004 风格的 Agent 链上身份合约
 * 
 * 功能：
 * - 注册 Agent 身份（唯一 ID）
 * - 记录信誉分数
 * - 信誉影响服务价格
 */
contract AgentIdentity {
    // Agent 结构体
    struct Agent {
        uint256 id;
        address owner;
        string name;
        string description;
        uint256 reputation;      // 信誉分数 (0-1000)
        uint256 totalQuestions;  // 总回答数
        uint256 totalEarnings;   // 总收益
        bool active;
        uint256 createdAt;
    }

    // 事件
    event AgentRegistered(uint256 indexed agentId, address indexed owner, string name);
    event ReputationUpdated(uint256 indexed agentId, int256 change, uint256 newReputation);
    event QuestionAnswered(uint256 indexed agentId, uint256 questionId, uint256 reward);
    event AgentDeactivated(uint256 indexed agentId);

    // 状态变量
    uint256 private _nextAgentId;
    mapping(uint256 => Agent) private _agents;
    mapping(address => uint256) private _ownerToAgentId;
    
    // 基础价格（USDC 单位）
    uint256 public basePrice = 1000000; // 1 USDC = 1000000 (6 decimals)
    
    // 信誉阈值配置
    uint256 public constant REPUTATION_LOW = 200;
    uint256 public constant REPUTATION_MEDIUM = 500;
    uint256 public constant REPUTATION_HIGH = 800;
    uint256 public constant MAX_REPUTATION = 1000;

    constructor() {
        _nextAgentId = 1;
    }

    /**
     * @dev 注册新的 Agent 身份
     * @param name Agent 名称
     * @param description Agent 描述
     */
    function registerAgent(string memory name, string memory description) 
        external 
        returns (uint256) 
    {
        require(_ownerToAgentId[msg.sender] == 0, "Agent already registered");
        require(bytes(name).length > 0, "Name required");
        
        uint256 agentId = _nextAgentId++;
        
        _agents[agentId] = Agent({
            id: agentId,
            owner: msg.sender,
            name: name,
            description: description,
            reputation: 500,  // 初始信誉 500
            totalQuestions: 0,
            totalEarnings: 0,
            active: true,
            createdAt: block.timestamp
        });
        
        _ownerToAgentId[msg.sender] = agentId;
        
        emit AgentRegistered(agentId, msg.sender, name);
        return agentId;
    }

    /**
     * @dev 获取 Agent 信息
     */
    function getAgent(uint256 agentId) 
        external 
        view 
        returns (
            uint256 id,
            address owner,
            string memory name,
            string memory description,
            uint256 reputation,
            uint256 totalQuestions,
            uint256 totalEarnings,
            bool active,
            uint256 createdAt
        ) 
    {
        Agent memory agent = _agents[agentId];
        require(agent.id != 0, "Agent not found");
        
        return (
            agent.id,
            agent.owner,
            agent.name,
            agent.description,
            agent.reputation,
            agent.totalQuestions,
            agent.totalEarnings,
            agent.active,
            agent.createdAt
        );
    }

    /**
     * @dev 通过地址获取 Agent ID
     */
    function getAgentIdByOwner(address owner) external view returns (uint256) {
        return _ownerToAgentId[owner];
    }

    /**
     * @dev 根据信誉计算价格乘数
     * 
     * 信誉越高，价格越高（优质服务）
     * - Low (<200): 0.5x (折扣价)
     * - Medium (200-500): 1.0x (基础价)
     * - High (500-800): 1.5x (优质价)
     * - Premium (>800): 2.0x (专家价)
     */
    function getPriceForAgent(uint256 agentId) external view returns (uint256) {
        Agent memory agent = _agents[agentId];
        require(agent.id != 0, "Agent not found");
        
        uint256 multiplier;
        if (agent.reputation < REPUTATION_LOW) {
            multiplier = 50;  // 0.5x
        } else if (agent.reputation < REPUTATION_MEDIUM) {
            multiplier = 100; // 1.0x
        } else if (agent.reputation < REPUTATION_HIGH) {
            multiplier = 150; // 1.5x
        } else {
            multiplier = 200; // 2.0x
        }
        
        return (basePrice * multiplier) / 100;
    }

    /**
     * @dev 更新信誉分数
     * @param agentId Agent ID
     * @param change 变化值（正数增加，负数减少）
     */
    function updateReputation(uint256 agentId, int256 change) external {
        Agent storage agent = _agents[agentId];
        require(agent.id != 0, "Agent not found");
        require(msg.sender == agent.owner, "Only agent owner can update");
        
        int256 newReputation = int256(agent.reputation) + change;
        if (newReputation < 0) {
            newReputation = 0;
        }
        if (newReputation > int256(MAX_REPUTATION)) {
            newReputation = int256(MAX_REPUTATION);
        }
        
        agent.reputation = uint256(newReputation);
        
        emit ReputationUpdated(agentId, change, agent.reputation);
    }

    /**
     * @dev 记录回答并增加信誉
     * @param agentId Agent ID
     * @param reward 获得的奖励
     */
    function recordAnswer(uint256 agentId, uint256 reward) external {
        Agent storage agent = _agents[agentId];
        require(agent.id != 0, "Agent not found");
        require(msg.sender == agent.owner, "Only agent owner can record");
        
        agent.totalQuestions++;
        agent.totalEarnings += reward;
        
        // 每次回答增加 5 点信誉
        if (agent.reputation < MAX_REPUTATION) {
            agent.reputation += 5;
            if (agent.reputation > MAX_REPUTATION) {
                agent.reputation = MAX_REPUTATION;
            }
        }
        
        emit QuestionAnswered(agentId, agent.totalQuestions, reward);
    }

    /**
     * @dev 停用 Agent
     */
    function deactivateAgent(uint256 agentId) external {
        Agent storage agent = _agents[agentId];
        require(agent.id != 0, "Agent not found");
        require(msg.sender == agent.owner, "Only agent owner can deactivate");
        
        agent.active = false;
        emit AgentDeactivated(agentId);
    }

    /**
     * @dev 获取 Agent 总数
     */
    function getTotalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }
}
