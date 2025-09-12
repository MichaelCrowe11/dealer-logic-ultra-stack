#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function testAgentConfigLoading() {
  console.log('🧪 Testing agent configuration loading...\n');
  
  try {
    // Load agents.json
    const agentsPath = path.join(process.cwd(), '..', 'agents.json');
    const agentsData = JSON.parse(fs.readFileSync(agentsPath, 'utf8'));
    
    console.log(`✅ Found ${agentsData.agents.length} total agents`);
    
    // Filter Dealer Logic agents
    const dealerLogicAgents = agentsData.agents.filter(agent => 
      agent.name.toLowerCase().includes('dealer logic')
    );
    
    console.log(`✅ Found ${dealerLogicAgents.length} Dealer Logic agents:`);
    
    for (const agent of dealerLogicAgents) {
      const configPath = agent.environments?.prod?.config || agent.config;
      
      if (!configPath) {
        console.log(`  ❌ ${agent.name} - No config path`);
        continue;
      }
      
      try {
        const fullConfigPath = path.join(process.cwd(), '..', configPath);
        const config = JSON.parse(fs.readFileSync(fullConfigPath, 'utf8'));
        
        const voiceId = config.conversation_config?.tts?.voice_id;
        const agentType = agent.name.toLowerCase().includes('reception') ? 'RECEPTION' :
                         agent.name.toLowerCase().includes('sales') ? 'SALES' :
                         agent.name.toLowerCase().includes('service') ? 'SERVICE' :
                         agent.name.toLowerCase().includes('parts') ? 'PARTS' : 'GENERAL';
        
        console.log(`  ✅ ${agent.name} (${agentType}) - Voice: ${voiceId || 'N/A'}`);
      } catch (configError) {
        console.log(`  ❌ ${agent.name} - Config load failed: ${configError.message}`);
      }
    }
    
    console.log('\n🎉 Agent configuration test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAgentConfigLoading();