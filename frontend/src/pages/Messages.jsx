import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Send, Paperclip, Plus, X } from 'lucide-react';
import { messageAPI, userAPI } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const Messages = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchConversations();
    
    // Check if user parameter is in URL (coming from another page)
    const userId = searchParams.get('user');
    const groupId = searchParams.get('group');
    
    if (userId) {
      // Start new conversation with this user
      startConversationWithUser(userId);
    } else if (groupId) {
      // Open group chat
      startGroupConversation(groupId);
    }
  }, [searchParams]);

  const startConversationWithUser = async (userId) => {
    // Check if conversation already exists
    const existing = conversations.find(c => c.userId === userId);
    if (existing) {
      setSelectedConversation(existing);
      loadMessages(userId, 'direct');
    } else {
      // Create new conversation object
      try {
        const response = await userAPI.getUser(userId);
        const otherUser = response.data.data;
        const newConv = {
          id: userId,
          type: 'direct',
          userId: userId,
          name: otherUser.name,
          unreadCount: 0,
        };
        setSelectedConversation(newConv);
        loadMessages(userId, 'direct');
      } catch (error) {
        toast.error('User not found');
      }
    }
  };

  const startGroupConversation = (groupId) => {
    const existing = conversations.find(c => c.groupId === groupId);
    if (existing) {
      setSelectedConversation(existing);
      loadMessages(groupId, 'group');
    }
  };

  const loadMessages = async (id, type) => {
    try {
      let response;
      if (type === 'direct') {
        response = await messageAPI.getDirectMessages(id);
      } else {
        response = await messageAPI.getGroupMessages(id);
      }
      setMessages(response.data.data || []);
    } catch (error) {
      console.error('Load messages error:', error);
      setMessages([]);
    }
  };

  const handleSearchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const response = await userAPI.searchUsers(query);
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const startNewChat = (selectedUser) => {
    setShowNewChatModal(false);
    setSearchQuery('');
    setSearchResults([]);
    startConversationWithUser(selectedUser._id);
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await messageAPI.getConversations();
      setConversations(response.data.data || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      // Set empty array instead of showing error
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

    console.log('Sending message to:', selectedConversation);
    console.log('Message text:', messageText);

    try {
      const data = {
        content: messageText,
        contentType: 'text',
      };

      let response;
      if (selectedConversation.type === 'direct') {
        // Direct message
        data.recipient = selectedConversation.userId;
        console.log('Sending direct message:', data);
        response = await messageAPI.sendDirectMessage(data);
      } else {
        // Group message
        data.group = selectedConversation.groupId;
        console.log('Sending group message:', data);
        response = await messageAPI.sendGroupMessage(data);
      }

      console.log('Message sent successfully:', response.data);
      
      // Add message to local state
      const newMessage = response.data.data;
      setMessages([...messages, newMessage]);
      setMessageText('');
      
      toast.success('Message sent!');
    } catch (error) {
      console.error('Send message error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-display font-bold gradient-text">Messages</h1>
        <button
          onClick={() => setShowNewChatModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Chat
        </button>
      </div>

      <div className="glass-card h-[calc(100%-5rem)] flex overflow-hidden">
        {/* Sidebar - Conversations */}
        <div className="w-80 border-r border-dark-700 flex flex-col">
          <div className="p-4 border-b border-dark-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="input-field pl-10 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-4 border-b border-dark-700 cursor-pointer hover:bg-dark-700/30 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-dark-700/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {conv.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{conv.name}</h3>
                      <p className="text-sm text-gray-400 truncate">
                        {conv.lastMessage}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="badge-primary text-xs">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-dark-700">
                <h2 className="text-xl font-semibold">{selectedConversation.name}</h2>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${
                      msg.sender === user._id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-md px-4 py-2 rounded-lg ${
                        msg.sender === user._id
                          ? 'bg-primary-600 text-white'
                          : 'bg-dark-700 text-gray-200'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <span className="text-xs opacity-70">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-dark-700">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="p-3 hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <Paperclip className="w-5 h-5 text-gray-400" />
                  </button>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="input-field flex-1"
                  />
                  <button type="submit" className="btn-primary">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowNewChatModal(false)}
        >
          <div
            className="glass-card p-6 max-w-md w-full max-h-[600px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-display font-bold">Start New Chat</h2>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-2 hover:bg-dark-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchUsers(e.target.value);
                }}
                placeholder="Search users by name..."
                className="input-field pl-11 w-full"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {searchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loader"></div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {searchQuery ? 'No users found' : 'Search for users to chat with'}
                </div>
              ) : (
                searchResults.map((resultUser) => (
                  <button
                    key={resultUser._id}
                    onClick={() => startNewChat(resultUser)}
                    className="w-full p-3 hover:bg-dark-700 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {resultUser.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{resultUser.name}</div>
                      <div className="text-sm text-gray-400">{resultUser.email}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;