import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { api } from './api';
import './App.css';

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
      console.log('loadConversation: Successfully loaded conversation', id);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation();
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
      console.log('handleNewConversation: Created new conversation', newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
    console.log('handleSelectConversation: Selected conversation ID', id);
  };

  const handleSendMessage = async (content) => {
    console.log('handleSendMessage: Called with content:', content);
    if (!currentConversationId) {
      console.log('handleSendMessage: No currentConversationId, returning.');
      return;
    }
    
    console.log('handleSendMessage: currentConversation before optimistic update:', JSON.stringify(currentConversation)); // Log before optimistic update

    setIsLoading(true);
    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => {
        const updatedConversation = {
          ...prev,
          messages: [...(prev?.messages || []), userMessage],
        };
        console.log('handleSendMessage: currentConversation after optimistic user message:', JSON.stringify(updatedConversation)); // Log after optimistic user message
        return updatedConversation;
      });

      // Create a partial assistant message that will be updated progressively
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: false,
          stage2: false,
          stage3: false,
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => {
        const updatedConversation = {
          ...prev,
          messages: [...(prev?.messages || []), assistantMessage],
        };
        console.log('handleSendMessage: currentConversation after optimistic assistant placeholder:', JSON.stringify(updatedConversation)); // Log after optimistic assistant placeholder
        return updatedConversation;
      });

      // Send message with streaming
      await api.sendMessageStream(currentConversationId, content, (eventType, event) => {
        console.log(`--- onEvent callback triggered. Event Type: ${eventType} ---`);
        switch (eventType) {
          case 'stage1_start':
            setCurrentConversation((prev) => {
              const messages = [...(prev?.messages || [])];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage1 = true;
              const updatedConversation = { ...prev, messages };
              console.log('onEvent (stage1_start): currentConversation updated.');
              return updatedConversation;
            });
            break;

          case 'stage1_complete':
            setCurrentConversation((prev) => {
              const messages = [...(prev?.messages || [])];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage1 = event.data;
              lastMsg.loading.stage1 = false;
              const updatedConversation = { ...prev, messages };
              console.log('onEvent (stage1_complete): currentConversation updated.');
              return updatedConversation;
            });
            break;

          case 'stage2_start':
            setCurrentConversation((prev) => {
              const messages = [...(prev?.messages || [])];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage2 = true;
              const updatedConversation = { ...prev, messages };
              console.log('onEvent (stage2_start): currentConversation updated.');
              return updatedConversation;
            });
            break;

          case 'stage2_complete':
            setCurrentConversation((prev) => {
              const messages = [...(prev?.messages || [])];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage2 = event.data;
              lastMsg.metadata = event.metadata;
              lastMsg.loading.stage2 = false;
              const updatedConversation = { ...prev, messages };
              console.log('onEvent (stage2_complete): currentConversation updated.');
              return updatedConversation;
            });
            break;

          case 'stage3_start':
            setCurrentConversation((prev) => {
              const messages = [...(prev?.messages || [])];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage3 = true;
              const updatedConversation = { ...prev, messages };
              console.log('onEvent (stage3_start): currentConversation updated.');
              return updatedConversation;
            });
            break;

          case 'stage3_complete':
            setCurrentConversation((prev) => {
              const messages = [...(prev?.messages || [])];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage3 = event.data;
              lastMsg.loading.stage3 = false;
              const updatedConversation = { ...prev, messages };
              console.log('onEvent (stage3_complete): currentConversation updated.');
              return updatedConversation;
            });
            break;

          case 'title_complete':
            console.log('onEvent (title_complete): Reloading conversations.');
            loadConversations(); // Reload conversations to get updated title
            break;

          case 'complete':
            console.log('onEvent (complete): Stream finished.');
            loadConversations(); // Reload conversations list
            setIsLoading(false);
            // Note: If prev.messages is used here, it might be slightly stale if not careful.
            // For simplicity and debugging, we assume the stream has finished and we'll reload from backend.
            break;

          case 'error':
            console.error('Stream error:', event.message);
            // Remove optimistic messages on error
            setCurrentConversation((prev) => {
              // Attempt to remove the last two messages (user and placeholder assistant)
              const updatedMessages = (prev?.messages || []).slice(0, -2);
              const updatedConversation = { ...prev, messages: updatedMessages };
              console.log('onEvent (error): currentConversation state after error handling:', JSON.stringify(updatedConversation));
              return updatedConversation;
            });
            setIsLoading(false);
            break;

          default:
            console.log('Unknown event type:', eventType);
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic messages on error
      setCurrentConversation((prev) => {
        // Attempt to remove the last two messages (user and placeholder assistant)
        const updatedMessages = (prev?.messages || []).slice(0, -2);
        const updatedConversation = { ...prev, messages: updatedMessages };
        console.log('handleSendMessage: currentConversation in catch block:', JSON.stringify(updatedConversation));
        return updatedConversation;
      });
      setIsLoading(false);
    }
  };

  console.log('App component rendering. Current Conversation state before passing to ChatInterface:', JSON.stringify(currentConversation)); // Log currentConversation state before rendering ChatInterface
  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />
      <ChatInterface
        conversation={currentConversation}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}

export default App;
