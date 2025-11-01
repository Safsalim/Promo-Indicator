#!/usr/bin/env node

require('dotenv').config();
const Channel = require('../models/Channel');
const liveStreamCollector = require('../services/liveStreamCollector');
const { closeDatabase } = require('../config/database');

function printHelp() {
  console.log(`
Channel Management Tool

Usage: node manageChannels.js <command> [options]

Commands:
  list                    List all tracked channels
  list-active            List only active channels
  add <handle>           Add a new channel by YouTube handle (e.g., @channelname)
  enable <id>            Enable tracking for a channel
  disable <id>           Disable tracking for a channel
  info <id>              Show detailed info for a channel
  delete <id>            Delete a channel (WARNING: also deletes all metrics)
  help                   Show this help message

Examples:
  # List all channels
  node manageChannels.js list

  # Add a new channel
  node manageChannels.js add @ciidb

  # Disable channel tracking
  node manageChannels.js disable 1

  # Enable channel tracking
  node manageChannels.js enable 1

  # View channel info
  node manageChannels.js info 1

  # Delete a channel
  node manageChannels.js delete 1
`);
}

function formatChannelList(channels) {
  if (channels.length === 0) {
    console.log('No channels found.');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('Tracked Channels');
  console.log('='.repeat(80));
  console.log(
    'ID'.padEnd(5) +
    'Handle'.padEnd(25) +
    'Name'.padEnd(30) +
    'Status'.padEnd(10) +
    'Added'
  );
  console.log('-'.repeat(80));

  channels.forEach(channel => {
    const status = channel.is_active ? 'Active' : 'Inactive';
    const addedDate = new Date(channel.added_date).toISOString().split('T')[0];
    
    console.log(
      String(channel.id).padEnd(5) +
      (channel.channel_handle || 'N/A').padEnd(25) +
      (channel.channel_name || 'N/A').substring(0, 28).padEnd(30) +
      status.padEnd(10) +
      addedDate
    );
  });

  console.log('='.repeat(80));
  console.log(`Total: ${channels.length} channel(s)\n`);
}

function formatChannelInfo(channel) {
  console.log('\n' + '='.repeat(60));
  console.log('Channel Information');
  console.log('='.repeat(60));
  console.log(`ID:              ${channel.id}`);
  console.log(`Handle:          ${channel.channel_handle || 'N/A'}`);
  console.log(`YouTube ID:      ${channel.channel_id || 'N/A'}`);
  console.log(`Name:            ${channel.channel_name || 'N/A'}`);
  console.log(`Status:          ${channel.is_active ? 'Active' : 'Inactive'}`);
  console.log(`Added:           ${new Date(channel.added_date).toISOString()}`);
  console.log('='.repeat(60) + '\n');
}

async function addChannel(handle) {
  try {
    if (!handle || !handle.startsWith('@')) {
      console.error('Error: Channel handle must start with @ (e.g., @channelname)');
      return false;
    }

    const existing = Channel.findByHandle(handle);
    if (existing) {
      console.log(`Channel ${handle} already exists with ID ${existing.id}`);
      formatChannelInfo(existing);
      return false;
    }

    console.log(`Fetching channel information for ${handle}...`);
    
    const { channelId, channelTitle } = await liveStreamCollector.getChannelIdByHandle(handle);
    
    console.log(`Found channel: ${channelTitle}`);
    console.log(`YouTube Channel ID: ${channelId}`);

    const existingById = Channel.findByChannelId(channelId);
    if (existingById) {
      console.log(`This YouTube channel is already tracked with handle: ${existingById.channel_handle}`);
      formatChannelInfo(existingById);
      return false;
    }

    const result = Channel.create({
      channel_handle: handle,
      channel_id: channelId,
      channel_name: channelTitle,
      is_active: 1
    });

    console.log(`✓ Successfully added channel with ID ${result.lastInsertRowid}`);
    
    const newChannel = Channel.findById(result.lastInsertRowid);
    formatChannelInfo(newChannel);
    
    return true;
  } catch (error) {
    console.error('Error adding channel:', error.message);
    return false;
  }
}

function listChannels(activeOnly = false) {
  try {
    const channels = activeOnly ? Channel.findActive() : Channel.findAll();
    formatChannelList(channels);
    return true;
  } catch (error) {
    console.error('Error listing channels:', error.message);
    return false;
  }
}

function enableChannel(channelId) {
  try {
    const id = parseInt(channelId);
    if (isNaN(id)) {
      console.error('Error: Invalid channel ID');
      return false;
    }

    const channel = Channel.findById(id);
    if (!channel) {
      console.error(`Error: Channel with ID ${id} not found`);
      return false;
    }

    if (channel.is_active) {
      console.log(`Channel ${channel.channel_handle} is already active`);
      return true;
    }

    Channel.setActive(id, true);
    console.log(`✓ Enabled tracking for channel ${channel.channel_handle}`);
    
    const updated = Channel.findById(id);
    formatChannelInfo(updated);
    
    return true;
  } catch (error) {
    console.error('Error enabling channel:', error.message);
    return false;
  }
}

function disableChannel(channelId) {
  try {
    const id = parseInt(channelId);
    if (isNaN(id)) {
      console.error('Error: Invalid channel ID');
      return false;
    }

    const channel = Channel.findById(id);
    if (!channel) {
      console.error(`Error: Channel with ID ${id} not found`);
      return false;
    }

    if (!channel.is_active) {
      console.log(`Channel ${channel.channel_handle} is already inactive`);
      return true;
    }

    Channel.setActive(id, false);
    console.log(`✓ Disabled tracking for channel ${channel.channel_handle}`);
    
    const updated = Channel.findById(id);
    formatChannelInfo(updated);
    
    return true;
  } catch (error) {
    console.error('Error disabling channel:', error.message);
    return false;
  }
}

function showChannelInfo(channelId) {
  try {
    const id = parseInt(channelId);
    if (isNaN(id)) {
      console.error('Error: Invalid channel ID');
      return false;
    }

    const channel = Channel.findById(id);
    if (!channel) {
      console.error(`Error: Channel with ID ${id} not found`);
      return false;
    }

    formatChannelInfo(channel);
    return true;
  } catch (error) {
    console.error('Error fetching channel info:', error.message);
    return false;
  }
}

function deleteChannel(channelId) {
  try {
    const id = parseInt(channelId);
    if (isNaN(id)) {
      console.error('Error: Invalid channel ID');
      return false;
    }

    const channel = Channel.findById(id);
    if (!channel) {
      console.error(`Error: Channel with ID ${id} not found`);
      return false;
    }

    console.log(`WARNING: This will delete channel ${channel.channel_handle} and ALL associated metrics!`);
    console.log('This action cannot be undone.');
    
    Channel.delete(id);
    console.log(`✓ Deleted channel ${channel.channel_handle}`);
    
    return true;
  } catch (error) {
    console.error('Error deleting channel:', error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    closeDatabase();
    process.exit(0);
  }

  const command = args[0];
  const param = args[1];

  let success = false;

  try {
    switch (command) {
      case 'list':
        success = listChannels(false);
        break;
      
      case 'list-active':
        success = listChannels(true);
        break;
      
      case 'add':
        if (!param) {
          console.error('Error: Channel handle required. Example: node manageChannels.js add @channelname');
          success = false;
        } else {
          success = await addChannel(param);
        }
        break;
      
      case 'enable':
        if (!param) {
          console.error('Error: Channel ID required. Example: node manageChannels.js enable 1');
          success = false;
        } else {
          success = enableChannel(param);
        }
        break;
      
      case 'disable':
        if (!param) {
          console.error('Error: Channel ID required. Example: node manageChannels.js disable 1');
          success = false;
        } else {
          success = disableChannel(param);
        }
        break;
      
      case 'info':
        if (!param) {
          console.error('Error: Channel ID required. Example: node manageChannels.js info 1');
          success = false;
        } else {
          success = showChannelInfo(param);
        }
        break;
      
      case 'delete':
        if (!param) {
          console.error('Error: Channel ID required. Example: node manageChannels.js delete 1');
          success = false;
        } else {
          success = deleteChannel(param);
        }
        break;
      
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run "node manageChannels.js help" for usage information');
        success = false;
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    success = false;
  } finally {
    closeDatabase();
  }

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  addChannel,
  listChannels,
  enableChannel,
  disableChannel,
  showChannelInfo,
  deleteChannel
};
