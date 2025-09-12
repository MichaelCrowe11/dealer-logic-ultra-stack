#!/usr/bin/env node

const { ConvAISyncService } = require('../dist/backend/services/convai-sync.service');
const { connectDatabase } = require('../dist/backend/database/connection');

async function main() {
  try {
    console.log('🚀 Starting Dealer Logic agent synchronization...\n');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');
    
    // Initialize sync service
    const syncService = new ConvAISyncService();
    
    // Sync agents
    const syncedAgents = await syncService.syncAllDealerLogicAgents();
    
    console.log(`\n✅ Successfully synchronized ${syncedAgents.length} agents:`);
    syncedAgents.forEach(agent => {
      const metadata = agent.metadata || {};
      console.log(`  - ${agent.name} (${metadata.agentType || 'GENERAL'})`);
    });
    
    console.log('\n🎉 Agent synchronization completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Synchronization failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'sync':
    main();
    break;
  case 'help':
  case '--help':
  case '-h':
    console.log(`
Dealer Logic Agent Synchronization Tool

Usage:
  node scripts/sync-agents.js sync    Sync all Dealer Logic agents from ConvAI

Options:
  -h, --help                          Show this help message

Examples:
  node scripts/sync-agents.js sync    # Sync all agents
    `);
    break;
  default:
    console.log('Unknown command. Use "sync" or "--help" for usage information.');
    process.exit(1);
}