const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../common/config');

/**
 * Initialize WebSocket server
 * @param {Object} server - HTTP server to attach WebSocket server to
 */
function initializeWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws'
  });

  // Store active connections with user IDs
  const connections = new Map();

  wss.on('connection', async (ws, req) => {
    // Extract token from URL query string
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(1008, 'No authentication token provided');
      return;
    }

    // Verify and decode token
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET_KEY);
      const userId = decoded.id;
      
      // Store connection with user ID
      connections.set(userId, ws);
      ws.userId = userId;
      
      console.log(`WebSocket client connected. User ID: ${userId}. Total clients: ${connections.size}`);
      
      // Send a welcome message with current online users
      const onlineUserIds = Array.from(connections.keys()).filter(id => id !== userId);
      ws.send(JSON.stringify({
        type: 'connection_established',
        data: { 
          message: 'Connected to WebChat WebSocket server',
          timestamp: new Date().toISOString(),
          onlineUsers: onlineUserIds
        }
      }));

      // Broadcast online status to all connected users
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== ws) {
          client.send(JSON.stringify({
            type: 'user_online',
            data: { 
              userId,
              timestamp: new Date().toISOString()
            }
          }));
        }
      });
      
      // TODO: Update user's status to "online" in the database
      // You can implement this with your user model

    } catch (error) {
      console.error('WebSocket authentication error:', error.message);
      ws.close(1008, 'Authentication failed');
      return;
    }

    // Handle messages from client
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        handleClientMessage(ws, parsedMessage);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' }
        }));
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      if (ws.userId) {
        connections.delete(ws.userId);
        console.log(`WebSocket client disconnected. User ID: ${ws.userId}. Total clients: ${connections.size}`);
        
        // Broadcast offline status to all connected users
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'user_offline',
              data: { 
                userId: ws.userId,
                lastSeen: new Date().toISOString()
              }
            }));
          }
        });
        
        // TODO: Update user's status to "offline" in the database
        // You can implement this with your user model
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (ws.userId) {
        connections.delete(ws.userId);
      }
    });
  });

  /**
   * Handle messages from client
   * @param {Object} ws - WebSocket connection
   * @param {Object} message - Parsed message from client
   */
  function handleClientMessage(ws, message) {
    const { type, data } = message;

    switch (type) {
      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          data: { timestamp: new Date().toISOString() }
        }));
        break;
      
      case 'get_online_users':
        // Send current list of online users
        const onlineUserIds = Array.from(connections.keys());
        ws.send(JSON.stringify({
          type: 'online_users_list',
          data: { 
            onlineUsers: onlineUserIds,
            timestamp: new Date().toISOString()
          }
        }));
        break;
        
      case 'friend_request':
        // Handle friend request messages
        console.log('Processing friend_request message', data);
        break;
        
      case 'friend_request_accepted':
        // Handle friend request accepted messages
        console.log('Processing friend_request_accepted message', data);
        break;

      case 'friend_request_rejected':
        // Handle friend request rejected messages
        console.log('Processing friend_request_rejected message', data);
        break;

      case 'friend_request_cancelled':
        // Handle friend request cancelled messages
        console.log('Processing friend_request_cancelled message', data);
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: `Unknown message type: ${type}` }
        }));
    }
  }

  /**
   * Send a message to a specific user
   * @param {String} userId - User ID
   * @param {String} type - Message type
   * @param {Object} data - Message data
   */
  function sendToUser(userId, type, data) {
    try {
      console.log(`Attempting to send ${type} message to user ${userId}`);
      
      const ws = connections.get(userId);
      if (!ws) {
        console.log(`User ${userId} is not connected`);
        return false;
      }
      
      if (ws.readyState !== WebSocket.OPEN) {
        console.log(`Connection to user ${userId} is not open (state: ${ws.readyState})`);
        return false;
      }
      
      const message = JSON.stringify({
        type,
        data
      });
      
      console.log(`Sending message to ${userId}:`, message.substring(0, 200) + (message.length > 200 ? '...' : ''));
      ws.send(message);
      console.log(`Message sent successfully to ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error sending message to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Send a message to multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {String} type - Message type
   * @param {Object} data - Message data
   * @returns {Object} - Object with successful and failed user IDs
   */
  function sendToUsers(userIds, type, data) {
    const results = {
      successful: [],
      failed: []
    };
    
    userIds.forEach(userId => {
      if (sendToUser(userId, type, data)) {
        results.successful.push(userId);
      } else {
        results.failed.push(userId);
      }
    });
    
    return results;
  }

  /**
   * Broadcast a message to all connected users
   * @param {String} type - Message type
   * @param {Object} data - Message data
   * @param {Array} exclude - Array of user IDs to exclude
   */
  function broadcast(type, data, exclude = []) {
    const excludeSet = new Set(exclude);
    
    connections.forEach((ws, userId) => {
      if (!excludeSet.has(userId) && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type,
          data
        }));
      }
    });
  }

  /**
   * Get all connected user IDs
   * @returns {Array} - Array of user IDs
   */
  function getConnectedUsers() {
    return Array.from(connections.keys());
  }

  /**
   * Check if a user is connected
   * @param {String} userId - User ID
   * @returns {Boolean} - True if user is connected
   */
  function isUserConnected(userId) {
    return connections.has(userId);
  }

  // Expose methods for external use
  return {
    sendToUser,
    sendToUsers,
    broadcast,
    getConnectedUsers,
    isUserConnected
  };
}

module.exports = initializeWebSocketServer;
