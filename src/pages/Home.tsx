import { useState, useMemo, useReducer,useRef,useEffect } from 'react';
import Tooltip from '../components/Tooltip';
import { getZhipuReplyByWebSocket } from '../api/getZhipuReplyByWebSocket';
import ReactMarkdown from 'react-markdown';

const roles = [
  { name: 'AI助手', emoji: '🤖' },
  { name: '医生', emoji: '🩺' },
  { name: '老师', emoji: '📚' },
  { name: '程序员', emoji: '💻' },
];

interface ChatMessage {
  sender: 'user' | 'ai';
  content: string;
}

type State = {
  messagesByRole: Record<string, ChatMessage[]>;
  loadingByRole: Record<string, boolean>;
};

type Action =
  | { type: 'ADD_MESSAGE'; role: string; message: ChatMessage }
  | { type: 'SET_LOADING'; role: string; loading: boolean }
  | { type: 'RESET_MESSAGES'; role: string };

const initialState: State = {
  messagesByRole: roles.reduce((acc, role) => {
    acc[role.name] = [];
    return acc;
  }, {} as Record<string, ChatMessage[]>),
  loadingByRole: roles.reduce((acc, role) => {
    acc[role.name] = false;
    return acc;
  }, {} as Record<string, boolean>),
};

function chatReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_MESSAGE': {
      const { role, message } = action;
      const lastMessages = state.messagesByRole[role];
      // 如果是 AI 并且上一条是 AI 的，则拼接
      if (message.sender === 'ai' && lastMessages.length > 0 && lastMessages[lastMessages.length - 1].sender === 'ai') {
        const updatedMessages = [...lastMessages];
        updatedMessages[updatedMessages.length - 1] = {
          ...updatedMessages[updatedMessages.length - 1],
          content: message.content,
        };
        return {
          ...state,
          messagesByRole: {
            ...state.messagesByRole,
            [role]: updatedMessages,
          },
        };
      }
    
      return {
        ...state,
        messagesByRole: {
          ...state.messagesByRole,
          [role]: [...lastMessages, message],
        },
      };
    }
    case 'SET_LOADING': {
      return {
        ...state,
        loadingByRole: {
          ...state.loadingByRole,
          [action.role]: action.loading,
        },
      };
    }
    case 'RESET_MESSAGES': {
      return {
        ...state,
        messagesByRole: {
          ...state.messagesByRole,
          [action.role]: [],
        },
      };
    }
    default:
      return state;
  }
}

const Home: React.FC = () => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [message, setMessage] = useState('');
  const currentAIMessageRef = useRef('');
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const messages = state.messagesByRole[selectedRole.name];
  const loading = state.loadingByRole[selectedRole.name];
  const wordCount = useMemo(() => message.trim().length, [message]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  

  // 每次 messages 或 loading 变化时滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);


  const handleSendMessage = async () => {
    if (!message.trim()) return;
  
    const userMessage = { sender: 'user', content: message };
    dispatch({ type: 'ADD_MESSAGE', role: selectedRole.name, message: userMessage });
    setMessage('');
    dispatch({ type: 'SET_LOADING', role: selectedRole.name, loading: true });
  
    const chatHistory = [
      ...state.messagesByRole[selectedRole.name],
      userMessage,
    ].slice(-5).map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));
  
    currentAIMessageRef.current = '';
  
    // 添加一条空消息用于后续拼接打字机文本
    dispatch({
      type: 'ADD_MESSAGE',
      role: selectedRole.name,
      message: { sender: 'ai', content: '' },
    });
  
    getZhipuReplyByWebSocket(
      chatHistory,
      (partial) => {
        currentAIMessageRef.current += partial;
        dispatch({
          type: 'ADD_MESSAGE',
          role: selectedRole.name,
          message: { sender: 'ai', content: currentAIMessageRef.current },
        });
      },
      () => {
        dispatch({ type: 'SET_LOADING', role: selectedRole.name, loading: false });
      },
      (err) => {
        console.error('WebSocket error:', err);
        dispatch({
          type: 'ADD_MESSAGE',
          role: selectedRole.name,
          message: { sender: 'ai', content: '❌ 出现错误，请稍后重试' },
        });
        dispatch({ type: 'SET_LOADING', role: selectedRole.name, loading: false });
      }
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 to-blue-400 flex items-center justify-center p-2 md:p-4 font-[Comic_Sans_MS]">
      <div className="relative w-full max-w-3xl px-1 md:px-2">
        {/* 角色按钮 - 移动端缩小尺寸 */}
        <div className="absolute top-2 md:top-4 left-1/2 transform -translate-x-1/2 flex space-x-2 md:space-x-4 z-20">
          <div
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="bg-white shadow-lg rounded-full p-2 md:p-3 cursor-pointer transition-all duration-300 transform hover:scale-110 hover:shadow-xl"
          >
            <span className="text-lg md:text-xl">{selectedRole.emoji}</span>
          </div>
        </div>

        {/* 角色菜单 - 移动端全宽 */}
        {showRoleMenu && (
          <div className="absolute top-12 md:top-16 left-1/2 transform -translate-x-1/2 w-[90vw] max-w-xs md:w-48 bg-white shadow-xl rounded-lg p-2 md:p-4 space-y-1 md:space-y-2 z-30">
            {roles.map((role) => (
              <div
                key={role.name}
                onClick={() => {
                  setSelectedRole(role);
                  setShowRoleMenu(false);
                }}
                className={`flex items-center space-x-2 cursor-pointer transition-all duration-300 transform ${
                  selectedRole.name === role.name 
                    ? 'bg-yellow-400' 
                    : 'bg-white hover:bg-yellow-100'
                } rounded-full px-3 py-1 md:px-4 md:py-2 hover:scale-105 hover:shadow-lg`}
              >
                <span className="text-lg md:text-xl">{role.emoji}</span>
                <span className="text-xs md:text-sm text-gray-700">{role.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* 聊天卡片 - 移动端高度调整 */}
        <div className="w-full bg-white shadow-xl rounded-xl md:rounded-2xl h-[80vh] max-h-[700px] flex flex-col p-3 md:p-6 mt-12 md:mt-16">
          {/* 标题区域 - 移动端缩小文字 */}
          <div className="text-lg md:text-xl font-semibold mb-2 md:mb-4 flex items-center justify-between text-gray-700">
            <div className="flex items-center space-x-2">
              <span>{selectedRole.emoji}</span>
              <span>{selectedRole.name} 为你服务</span>
            </div>
            <button
              onClick={() => dispatch({ type: 'RESET_MESSAGES', role: selectedRole.name })}
              className="text-xs md:text-sm px-2 py-0.5 md:px-3 md:py-1 bg-red-400 text-white rounded-full shadow hover:bg-red-500 transition transform hover:scale-110"
            >
              🧹 清空
            </button>
          </div>

          {/* 消息区域 - 移动端气泡优化 */}
          <div className="flex-1 overflow-y-auto space-y-2 md:space-y-4 pr-1 md:pr-2 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-400 text-xs md:text-sm text-center px-2 md:px-4">
                👋 你好，我是 {selectedRole.name}，很高兴见到你！<br />我可以帮你解答问题、提供建议、处理文件等，请告诉我你的任务吧~
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.sender === 'user';
                const avatar = isUser ? '🙋' : selectedRole.emoji;
                
                 // 如果是AI并且内容为空，则显示“正在输入”
                const isTyping = msg.sender === 'ai' && msg.content === '' && loading;

                return (
                  <div
                    key={idx}
                    className={`flex items-start mb-1 md:mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* 头像尺寸调整 */}
                    {!isUser && (
                      <div className="text-xl md:text-2xl mr-1 md:mr-2">{avatar}</div>
                    )}
              
                    {/* 气泡响应式宽度 */}
                    <div
                      className={`max-w-[85%] md:max-w-[70%] px-3 py-1 md:px-4 md:py-2 rounded-xl md:rounded-2xl shadow break-words text-sm md:text-base
                        ${isUser ? 'bg-yellow-300 text-white' : 'bg-gray-200 text-gray-800'}`}
                    >
                      {isTyping ? `${selectedRole.name} 正在输入...` : <ReactMarkdown>{msg.content}</ReactMarkdown>}
                    </div>
              
                    {isUser && (
                      <div className="text-xl md:text-2xl ml-1 md:ml-2">{avatar}</div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 - 移动端布局优化 */}
          <div className="relative bg-white border-2 border-gray-300 rounded-lg md:rounded-xl p-2 md:p-4 mt-3 md:mt-6">
            <div className="flex flex-col space-y-1 md:space-y-2">
            <input
              type="text"
              className="w-full p-2 md:p-3 bg-transparent border-none outline-none rounded-full text-sm md:text-lg placeholder-gray-400"
              placeholder="写点什么吧..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

              <div className="text-xs md:text-sm text-right text-gray-400">字数：{wordCount}</div>
              <div className="flex items-center justify-between gap-1 md:gap-2 mt-1 md:mt-2">
                <div className="flex gap-1 md:gap-2 flex-1">
                  {/* 按钮尺寸调整 */}
                  <Tooltip text="上传文件">
                    <button className="h-full px-3 py-1 md:px-4 md:py-2 bg-gray-400 text-white rounded-full shadow hover:bg-gray-500 transform hover:scale-105 hover:shadow-lg">
                      📎
                    </button>
                  </Tooltip>
                  <Tooltip text="总结">
                    <button className="h-full px-3 py-1 md:px-4 md:py-2 bg-blue-400 text-white rounded-full shadow hover:bg-blue-500 transform hover:scale-105 hover:shadow-lg text-xs md:text-sm">
                      📝 总结
                    </button>
                  </Tooltip>
                  <Tooltip text="翻译">
                    <button className="h-full px-3 py-1 md:px-4 md:py-2 bg-purple-400 text-white rounded-full shadow hover:bg-purple-500 transform hover:scale-105 hover:shadow-lg text-xs md:text-sm">
                      🌐 翻译
                    </button>
                  </Tooltip>
                </div>
                <div className="flex gap-1 md:gap-2">
                  <Tooltip text="语音输入">
                    <button className="h-full px-3 py-1 md:px-4 md:py-2 bg-orange-400 text-white rounded-full shadow hover:bg-orange-500 transform hover:scale-105 hover:shadow-lg">
                      🎤
                    </button>
                  </Tooltip>
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    className={`h-full px-3 py-1 md:px-4 md:py-2 rounded-full shadow transform hover:scale-105 hover:shadow-lg text-sm md:text-base text-white 
                      ${!message.trim() 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-green-400 hover:bg-green-500'}`}
                  >
                    ✈️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;