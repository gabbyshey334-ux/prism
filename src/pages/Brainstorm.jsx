import React, { useState, useEffect, useRef } from "react";
import { prism } from "@/api/prismClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Plus, Trash2, Sparkles, MessageCircle } from "lucide-react";
import MessageBubble from "../components/brainstorm/MessageBubble";
import { toast } from "sonner";

export default function Brainstorm() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const messagesEndRef = useRef(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await prism.auth.isAuthenticated();
        if (!isAuth) {
          prism.auth.redirectToLogin(window.location.pathname);
          return;
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        prism.auth.redirectToLogin(window.location.pathname);
      }
    };
    checkAuth();
  }, []);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!currentConversation) return;

    const unsubscribe = prism.agents.subscribeToConversation(
      currentConversation.id,
      (data) => {
        setMessages(data.messages || []);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentConversation?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const convos = await prism.agents.listConversations({
        agent_name: "content_brainstormer"
      });
      setConversations(convos || []);
      
      // Load first conversation if exists
      if (convos && convos.length > 0 && !currentConversation) {
        loadConversation(convos[0]);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
      toast.error("Failed to load conversations");
    }
    setIsLoadingConversations(false);
  };

  const loadConversation = async (conversation) => {
    setCurrentConversation(conversation);
    setMessages(conversation.messages || []);
  };

  const createNewConversation = async () => {
    try {
      const newConvo = await prism.agents.createConversation({
        agent_name: "content_brainstormer",
        metadata: {
          name: "New Brainstorm Session",
          description: "Content ideation session"
        }
      });
      
      setConversations([newConvo, ...conversations]);
      setCurrentConversation(newConvo);
      setMessages([]);
      toast.success("New conversation started!");
    } catch (error) {
      console.error("Failed to create conversation:", error);
      toast.error("Failed to create conversation");
    }
  };

  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this conversation?")) {
      return;
    }

    try {
      await prism.agents.deleteConversation(conversationId);
      
      const updatedConvos = conversations.filter(c => c.id !== conversationId);
      setConversations(updatedConvos);
      
      if (currentConversation?.id === conversationId) {
        if (updatedConvos.length > 0) {
          loadConversation(updatedConvos[0]);
        } else {
          setCurrentConversation(null);
          setMessages([]);
        }
      }
      
      toast.success("Conversation deleted");
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentConversation) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Limit conversation history to last 20 messages to avoid payload size issues
      const conversationWithLimitedHistory = {
        ...currentConversation,
        messages: messages.slice(-20)
      };

      await prism.agents.addMessage(conversationWithLimitedHistory, {
        role: "user",
        content: userMessage
      });

      // Refresh conversations list to update metadata
      loadConversations();
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Try shortening your message or starting a new conversation.");
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoadingConversations) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
      }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#88925D' }} />
      </div>
    );
  }

  return (
    <div className="h-screen flex" style={{
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
    }}>
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col" style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(229, 165, 116, 0.3)'
      }}>
        <div className="p-4 border-b" style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}>
          <Button
            onClick={createNewConversation}
            className="w-full rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
              color: 'white'
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" style={{ color: '#88925D' }} />
              <p className="text-sm" style={{ color: '#8B7355' }}>
                No conversations yet
              </p>
            </div>
          ) : (
            conversations.map((convo) => (
              <Card
                key={convo.id}
                onClick={() => loadConversation(convo)}
                className={`p-3 cursor-pointer transition-all group relative ${
                  currentConversation?.id === convo.id ? 'ring-2' : ''
                }`}
                style={{
                  borderColor: currentConversation?.id === convo.id ? '#88925D' : 'rgba(229, 165, 116, 0.3)',
                  background: currentConversation?.id === convo.id 
                    ? 'linear-gradient(135deg, rgba(136, 146, 93, 0.1) 0%, rgba(164, 181, 139, 0.1) 100%)'
                    : 'white'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#3D3D2B' }}>
                      {convo.metadata?.name || 'Unnamed Conversation'}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#8B7355' }}>
                      {convo.messages?.length || 0} messages
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => deleteConversation(convo.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {!currentConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="max-w-md text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4" style={{ color: '#88925D' }} />
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#3D3D2B' }}>
                Welcome to Brainstorm
              </h2>
              <p className="mb-6" style={{ color: '#8B7355' }}>
                Start a new conversation to brainstorm viral content ideas with AI
              </p>
              <Button
                onClick={createNewConversation}
                className="rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                  color: 'white'
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Start Brainstorming
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b p-4" style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderColor: 'rgba(229, 165, 116, 0.3)'
            }}>
              <h2 className="font-semibold" style={{ color: '#3D3D2B' }}>
                {currentConversation.metadata?.name || 'Brainstorm Session'}
              </h2>
              <p className="text-sm" style={{ color: '#8B7355' }}>
                Chat with AI to develop viral content ideas
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <p style={{ color: '#8B7355' }}>
                    Start the conversation! Ask me anything about content ideas.
                  </p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <MessageBubble key={index} message={message} />
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#88925D' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4" style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderColor: 'rgba(229, 165, 116, 0.3)'
            }}>
              {messages.length > 30 && (
                <div className="mb-2 text-xs text-center" style={{ color: '#8B7355' }}>
                  💡 Tip: Consider starting a new conversation if messages are slow to send
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about content ideas, trends, formats..."
                  disabled={isLoading}
                  className="flex-1 rounded-xl border-2"
                  style={{ borderColor: 'rgba(229, 165, 116, 0.3)' }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                    color: 'white'
                  }}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}