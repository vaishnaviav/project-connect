const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const logger = require('../utils/logger');

// Store active users
const activeUsers = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    logger.info(`New socket connection: ${socket.id}`);

    // User joins
    socket.on('join', async (userId) => {
      try {
        socket.userId = userId;
        activeUsers.set(userId, socket.id);
        
        // Update user's last seen
        await User.findByIdAndUpdate(userId, { lastSeen: Date.now() });
        
        // Notify others that user is online
        socket.broadcast.emit('user-online', userId);
        
        logger.info(`User ${userId} joined`);
      } catch (error) {
        logger.error(`Error in join: ${error.message}`);
      }
    });

    // Join a group room
    socket.on('join-group', (groupId) => {
      socket.join(`group-${groupId}`);
      logger.info(`Socket ${socket.id} joined group ${groupId}`);
    });

    // Leave a group room
    socket.on('leave-group', (groupId) => {
      socket.leave(`group-${groupId}`);
      logger.info(`Socket ${socket.id} left group ${groupId}`);
    });

    // Send direct message
    socket.on('direct-message', async (data) => {
      try {
        const { recipientId, content, contentType, attachments } = data;
        
        // Create message in database
        const message = await Message.create({
          messageType: 'direct',
          sender: socket.userId,
          recipient: recipientId,
          content,
          contentType: contentType || 'text',
          attachments: attachments || []
        });

        // Populate sender info
        await message.populate('sender', 'name profilePicture');

        // Send to recipient if online
        const recipientSocketId = activeUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('new-message', message);
        }

        // Send confirmation to sender
        socket.emit('message-sent', message);

        logger.info(`Direct message from ${socket.userId} to ${recipientId}`);
      } catch (error) {
        logger.error(`Error sending direct message: ${error.message}`);
        socket.emit('message-error', { error: error.message });
      }
    });

    // Send group message
    socket.on('group-message', async (data) => {
      try {
        const { groupId, content, contentType, attachments } = data;
        
        // Verify user is group member
        const group = await Group.findById(groupId);
        if (!group || !group.isMember(socket.userId)) {
          throw new Error('Not authorized to send messages in this group');
        }

        // Create message in database
        const message = await Message.create({
          messageType: 'group',
          sender: socket.userId,
          group: groupId,
          content,
          contentType: contentType || 'text',
          attachments: attachments || []
        });

        // Populate sender info
        await message.populate('sender', 'name profilePicture');

        // Update group's last activity and message count
        group.lastActivity = Date.now();
        group.totalMessages += 1;
        await group.save();

        // Broadcast to all group members
        io.to(`group-${groupId}`).emit('new-group-message', message);

        logger.info(`Group message in ${groupId} from ${socket.userId}`);
      } catch (error) {
        logger.error(`Error sending group message: ${error.message}`);
        socket.emit('message-error', { error: error.message });
      }
    });

    // Typing indicator for direct messages
    socket.on('typing-direct', (recipientId) => {
      const recipientSocketId = activeUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user-typing', {
          userId: socket.userId,
          type: 'direct'
        });
      }
    });

    // Stop typing indicator for direct messages
    socket.on('stop-typing-direct', (recipientId) => {
      const recipientSocketId = activeUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user-stop-typing', {
          userId: socket.userId,
          type: 'direct'
        });
      }
    });

    // Typing indicator for group messages
    socket.on('typing-group', (groupId) => {
      socket.to(`group-${groupId}`).emit('user-typing', {
        userId: socket.userId,
        groupId,
        type: 'group'
      });
    });

    // Stop typing indicator for group messages
    socket.on('stop-typing-group', (groupId) => {
      socket.to(`group-${groupId}`).emit('user-stop-typing', {
        userId: socket.userId,
        groupId,
        type: 'group'
      });
    });

    // Mark message as read
    socket.on('mark-read', async (messageId) => {
      try {
        const message = await Message.findById(messageId);
        if (message) {
          message.markAsRead(socket.userId);
          await message.save();

          // Notify sender if direct message
          if (message.messageType === 'direct') {
            const senderSocketId = activeUsers.get(message.sender.toString());
            if (senderSocketId) {
              io.to(senderSocketId).emit('message-read', {
                messageId,
                readBy: socket.userId
              });
            }
          }
        }
      } catch (error) {
        logger.error(`Error marking message as read: ${error.message}`);
      }
    });

    // Message reaction
    socket.on('react-message', async (data) => {
      try {
        const { messageId, emoji } = data;
        const message = await Message.findById(messageId);
        
        if (message) {
          // Check if user already reacted
          const existingReaction = message.reactions.find(
            r => r.user.toString() === socket.userId
          );

          if (existingReaction) {
            existingReaction.emoji = emoji;
          } else {
            message.reactions.push({
              user: socket.userId,
              emoji
            });
          }

          await message.save();

          // Broadcast reaction
          if (message.messageType === 'group') {
            io.to(`group-${message.group}`).emit('message-reaction', {
              messageId,
              userId: socket.userId,
              emoji
            });
          } else {
            const recipientSocketId = activeUsers.get(message.recipient.toString());
            if (recipientSocketId) {
              io.to(recipientSocketId).emit('message-reaction', {
                messageId,
                userId: socket.userId,
                emoji
              });
            }
          }
        }
      } catch (error) {
        logger.error(`Error adding reaction: ${error.message}`);
      }
    });

    // User disconnect
    socket.on('disconnect', async () => {
      try {
        if (socket.userId) {
          activeUsers.delete(socket.userId);
          
          // Update user's last seen
          await User.findByIdAndUpdate(socket.userId, { lastSeen: Date.now() });
          
          // Notify others that user is offline
          socket.broadcast.emit('user-offline', socket.userId);
          
          logger.info(`User ${socket.userId} disconnected`);
        }
      } catch (error) {
        logger.error(`Error in disconnect: ${error.message}`);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error: ${error.message}`);
    });
  });

  // Emit online users count periodically
  setInterval(() => {
    io.emit('online-users-count', activeUsers.size);
  }, 30000); // Every 30 seconds
};