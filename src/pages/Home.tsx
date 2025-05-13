import { useState, useMemo, useReducer,useRef,useEffect } from 'react';
import Tooltip from '../components/Tooltip';
import { getZhipuReplyByWebSocket } from '../api/getZhipuReplyByWebSocket';
import ReactMarkdown from 'react-markdown';
import { parseFile } from "../api/parseFile.ts";
import { toast } from 'react-hot-toast';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { generateImage } from '../api/generateImage.ts';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { Volume2 } from 'lucide-react';
import { useIndexedDB } from '../hooks/useIndexedDB.ts';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

//单条消息的结构
interface ChatMessage {
  sender: 'user' | 'assistant';
  content: string;
  image?: string|null; 
}

type State = {
  messages: ChatMessage[];  // 存储消息数组
  loading: boolean;         // 存储加载状态
};

//定义了 reducer 支持的所有操作
type Action =
  | { type: 'ADD_MESSAGE'; message: ChatMessage }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'RESET_MESSAGES' }  //清空聊天记录
  | { type: 'REMOVE_LAST_AI_MESSAGE' }
  | { type: 'INIT_MESSAGES'; payload: ChatMessage[] };

const initialState: State = {
  messages: [],
  loading: false,
};

//根据不同的action更新状态
function chatReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_MESSAGE': {
      const { message } = action;  //获取新的聊天
      const lastMessages = state.messages;  //前一次聊天
      
      // 如果是 AI 并且上一条也是 AI 的，则拼接
      //这是前端实现流式输出的基础
      if (message.sender === 'assistant' && lastMessages.length > 0 && lastMessages[lastMessages.length - 1].sender === 'assistant') {
        const updatedMessages = [...lastMessages];
        updatedMessages[updatedMessages.length - 1] = {
          ...updatedMessages[updatedMessages.length - 1],
          content: message.content, //将最后一条消息的内容替换为当前新的内容
        };
        return {
          ...state,
          messages: updatedMessages,
        };
      }
      //如果上一个消息不是 AI，则直接将新消息添加到 messages 数组的末尾。
      return {
        ...state,
        messages: [...lastMessages, message],
      };
    }
    
    case 'SET_LOADING': {
      return {
        ...state,
        loading: action.loading, //更新loading
      };
    }
    case 'RESET_MESSAGES': {
      return {
        ...state,
        messages: [],
      };
    }
      //从indexDB初始化消息
    case 'INIT_MESSAGES': {
      return {
        ...state,
        messages: action.payload,
      };
    }
    //主要是为了处理加载时显示的那一段消息，加载成功就可以删除
    case 'REMOVE_LAST_AI_MESSAGE': {
      const updated = [...state.messages];
      // 移除最后一条 AI 消息
      if (updated.length > 0 && updated[updated.length - 1].sender === 'assistant') {
        updated.pop();
      }
      return {
        ...state,
        messages: updated,
      };
    }
    default:
      return state;
  }
}

const Home: React.FC = () => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [message, setMessage] = useState(''); //输入框中的消息
  const currentAIMessageRef = useRef('');
  const { speak, cancel } = useTextToSpeech();  
  const { saveMessage, getMessages, clearAllMessages, isDBReady } = useIndexedDB();
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const { startListening, stopListening, listening } = useSpeechRecognition();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const messages = state.messages;
  const loading = state.loading;

  const wordCount = useMemo(() => {
    return (message && typeof message === 'string' ? message.trim().length : 0);
  }, [message]);

  // 每次新增消息时滚动到底部
  useEffect(() => {
    if (virtuosoRef.current && messages.length > 0) {
      virtuosoRef.current.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior: 'smooth',
      });
    }
  }, [messages.length]); 
  
  //加载indexDB中保存的历史记录
  useEffect(() => {
    if (!isDBReady) return;
    const loadMessages = async () => {
      try {
        const messages = await getMessages();
        dispatch({ type: 'INIT_MESSAGES', payload: messages });
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };
    loadMessages();
  }, [isDBReady]);

  const handleVoiceClick = (msg: ChatMessage, index: number) => {
    const cleanContent = msg.content.replace(/[\p{Emoji_Presentation}\p{Emoji}\u200D]+/gu, '');
    if (speakingIndex === index) {
      cancel();
      setSpeakingIndex(null); // 如果当前是正在朗读的消息，点击取消
    } else {
      speak(cleanContent);
      setSpeakingIndex(index); // 设置当前正在朗读的消息的索引
    }
  };
  
  const clearHistory = () => {
    dispatch({ type: 'RESET_MESSAGES' }); // 清空消息的全局状态
    clearAllMessages(); // 清空本地存储的消息数据
  };

  const handleVoiceInput = () => {
    //开始语音识别
    if (!listening) {
      startListening((text) => {
        setMessage((prev) => prev + text); // 将识别的内容加到输入框中
      });
    } else {
      stopListening(); //如果正在监听，则停止监听
    }
  };
  
  //将一个 File 对象转换成 Base64 编码的字符串。
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      //readAsDataURL读取完成后，将结果传递给 resolve 返回
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      //读取文件，将文件内容转换为 Data URL（Base64 编码的字符串）
      reader.readAsDataURL(file);
    });
  };

  //上传图片文件，进行OCR解析
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];//如果文件列表存在，获取第一个文件
    if (!file) return;

    // 判断文件类型是否为图片
    if (!file.type.startsWith("image/")) {
      // 如果不是图片，显示提示信息
      toast.error("只能上传图片文件");
      return;
    }

    // 设置加载状态为 true
    dispatch({ type: 'SET_LOADING', loading: true });

     //生成图片消息，并保存到indexdb
    const imageBase64 = await fileToBase64(file);
    const userMessage: ChatMessage = {
      sender: 'user',
      content: '我上传了一张图片',
      image:  imageBase64,
    };

    dispatch({
      type: 'ADD_MESSAGE',
      message: userMessage
    });
    // 保存到 IndexedDB
    saveMessage(userMessage);

    dispatch({
      type: 'ADD_MESSAGE',
      message: { sender: 'assistant', content: '' },  // 空的ai消息
    });
  
    try {
      const text = await parseFile(file); //返回OCR解析结果

      dispatch({ type: 'REMOVE_LAST_AI_MESSAGE' });
      
      //根据解析结果，设置ai消息，并保存到indexdb
      const isEmptyText = text.trim() === '这张图片似乎没有文字内容。';
      const aiMessage:ChatMessage = {
        sender: 'assistant',
        content: isEmptyText
          ? text
          : `OCR识别成功，内容如下：\n\n${text}`,
      };
  
      dispatch({
        type: 'ADD_MESSAGE',
        message: aiMessage,
      });
  
      // 保存到 IndexedDB
      saveMessage(aiMessage);
    } catch (err: any) {
      // console.error("File parsing error:", err.message);
      toast.error("文件解析失败：" + err.message);
      const errorMessage:ChatMessage = {
        sender: 'assistant',
        content: `❌ 文件解析失败：${err.message}`,
      };
      dispatch({
        type: 'ADD_MESSAGE',
        message: errorMessage,
      });
      // 保存错误信息到 IndexedDB
      saveMessage(errorMessage);
    }finally {
      // 无论成功或失败，都设置loading为false
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  //根据输入框文字生成图像
  const handleImageGenerate = async () => {
    if (!message.trim()) return;
  
    dispatch({ type: 'ADD_MESSAGE', message: { sender: 'user', content: message } });
    saveMessage({ sender: 'user', content: message });
    setMessage(''); // 清空输入框
  
    // 设置加载状态为 true，开始图像生成
    dispatch({ type: 'SET_LOADING', loading: true });
    // 添加临时加载提示
    dispatch({ type: 'ADD_MESSAGE', message: { sender: 'assistant', content: '' } });
  
    try {
      const { imageUrl, base64Images} = await generateImage(message); // 调用生成图像的 API
      // 移除“图像生成中”提示
      dispatch({ type: 'REMOVE_LAST_AI_MESSAGE' });
      if (imageUrl) {
        let aiMessage:ChatMessage = { sender: 'assistant', content: '', image: base64Images }; // 存 base64
        dispatch({
          type: 'ADD_MESSAGE',
          message: aiMessage,
        });
        saveMessage(aiMessage); // 现在存的是 base64，可以刷新后读取
      } else {
       throw new Error('图像生成失败，请稍后重试。'); 
      }
    } catch (err: any) {
      // 出错时移除加载中的提示
      dispatch({ type: 'REMOVE_LAST_AI_MESSAGE' });
      const errorMessage: ChatMessage = {
        sender: 'assistant',
        content: `图像生成失败：${err.message}`,
      };
      dispatch({
        type: 'ADD_MESSAGE',
        message: errorMessage,
      });
       saveMessage(errorMessage);
    } finally {
      // 无论成功还是失败，最后都要更新加载状态为 false
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    

    //发送用户消息
    const userMessage:ChatMessage = { sender: 'user', content: message };
    dispatch({ type: 'ADD_MESSAGE', message: userMessage });
    setMessage('');
    saveMessage(userMessage);

    dispatch({ type: 'SET_LOADING', loading: true });
  
    //构建一个包含了最近五条消息的历史记录，以便让AI能有记忆
    const chatHistory:{ role: 'user' | 'assistant'; content: string }[]  = [
      ...state.messages,
      userMessage,
    ].slice(-5).map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));
    
    //重置 currentAIMessageRef.current，用于存储 AI 回复的拼接文本。
    currentAIMessageRef.current = '';
  
    // 添加一条空消息用于后续拼接打字机文本
    dispatch({
      type: 'ADD_MESSAGE',
      message: { sender: 'assistant', content: '' },
    });
    
    //通过 WebSocket 向后端发送请求并获取 AI 回复
    getZhipuReplyByWebSocket(
      chatHistory,
      //分步显示AI回复内容，实现打字机效果
      (partial) => {
        currentAIMessageRef.current += partial;
        dispatch({
          type: 'ADD_MESSAGE',
          message: { sender: 'assistant', content: currentAIMessageRef.current },
        });
      },
      //成功回调
      () => {
        dispatch({ type: 'SET_LOADING', loading: false });
        const aiMessage = {
          sender: 'assistant',
          content: currentAIMessageRef.current,
        };
        saveMessage(aiMessage);
      },
      //失败回调
      () => {
        // console.error('WebSocket error:', err);
        dispatch({
          type: 'ADD_MESSAGE',
          message: { sender: 'assistant', content: '❌ 出现错误，请稍后重试' },
        });
        dispatch({ type: 'SET_LOADING', loading: false });
        saveMessage({ sender: 'assistant', content: '❌ 出现错误，请稍后重试' });
      }
    );
};

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 to-blue-400 flex items-center justify-center p-2 md:p-4 font-[Comic_Sans_MS]">
      <div className="relative w-full max-w-3xl px-1 md:px-2">
        {/* 聊天卡片 */}
        <div className="w-full bg-white shadow-xl rounded-xl md:rounded-2xl h-[80vh] max-h-[700px] flex flex-col p-3 md:p-6 ">
          {/* 标题区域 */}
          <div className="text-lg md:text-xl font-semibold mb-2 md:mb-4 flex items-center justify-between text-gray-700">
            <div className="flex items-center space-x-2">
              <span>AI小助手 为你服务</span>
            </div>
            <button
              onClick={
                clearHistory  // 清空本地存储的消息数据
              }
              className="text-xs md:text-sm px-2 py-0.5 md:px-3 md:py-1 bg-red-400 text-white rounded-full shadow hover:bg-red-500 transition transform hover:scale-110"
            >
              🧹 清空
            </button>
          </div>

          {/* 消息区域 */} 
          <div className="flex-1 overflow-hidden">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-400 text-xs md:text-sm text-center px-2 md:px-4">
                👋 你好，我是 AI小助手，很高兴见到你！<br />我可以帮你解答问题、提供建议，还可以进行图像生成、图片文字识别等任务，请告诉我你的任务吧~
              </div>
            ) : (
                <Virtuoso
                  ref={virtuosoRef}
                  followOutput="auto" // 自动滚动到最新内容
                  style={{ height: '100%', marginBottom: 10 }}  
                  className="custom-scrollbar"
                  totalCount={messages.length}  // 设置消息的总数
                  itemContent={(index) => {
                    const msg = messages[index];
                    const isUser = msg.sender === 'user';
                    const avatar = isUser ? '🙋' : '🤖';
                    const isTyping = msg.sender === 'assistant' && !msg.content && !msg.image && loading;
                    const isSpeaking = speakingIndex === index;
                    return (
                      <div
                        key={index}
                        className={`flex items-start mb-1 md:mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isUser && (
                          <div className="text-xl md:text-2xl mr-1 md:mr-2">{avatar}</div>
                        )}
                        <div
                          className={`max-w-[85%] md:max-w-[70%] px-3 py-1 md:px-4 md:py-2 rounded-xl md:rounded-2xl shadow break-words text-sm md:text-base
                            ${isUser ? 'bg-yellow-300 text-white' : 'bg-gray-200 text-gray-800'}`}
                        > 
                        
                          {msg.image && (
                            <div className="mt-2">
                              <img src={msg.image} alt="图片预览" className="max-w-full h-auto rounded-lg shadow" />
                              {msg.sender === 'assistant' && (
                                <a
                                  href={msg.image}
                                  download="generated-image.png"
                                  className="block text-center text-xs mt-2 text-blue-500"
                                >
                                  点击下载图片
                                </a>
                              )}
                            </div>
                          )}
                         
                          {msg.content && (
                            <div className="relative">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                              {/* 语音播放按钮 */}
                              {msg.sender === 'assistant' && !msg.image && !loading && (
                                <div className="mt-1 flex justify-end items-center space-x-1">
                                  <button
                                    onClick={() => {
                                      handleVoiceClick(msg,index)} //朗读当前消息
                                    }
                                    className="text-gray-500 hover:text-black relative"
                                    title={isSpeaking ? "取消朗读" : "朗读此回复"}
                                  > 
                                    <Volume2 className={`w-4 h-4 transition-all duration-300 ${isSpeaking ? 'animate-pulse text-green-500' : ''}`} />
                                  </button>
                                  {isSpeaking && (
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
        
                          {isTyping && (
                            <div className="text-gray-500 italic animate-pulse">
                              AI小助手正在努力工作中...
                            </div>
                          )}
                        </div>
        
                        {isUser && (
                          <div className="text-xl md:text-2xl ml-1 md:ml-2">{avatar}</div>
                        )}
                      </div>
                    );
                  }}
              />
            )}
          </div>

          {/* 输入区域 */}
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
                  <Tooltip text="OCR识别">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      className="hidden"
                      id="fileInput"
                      onChange={handleFileSelect}
                    />
                    <button
                      disabled={loading}
                      type="button"
                      onClick={() => document.getElementById('fileInput')?.click()}
                      className="h-full px-3 py-1 md:px-4 md:py-2 bg-gray-400 text-white rounded-full shadow hover:bg-gray-500 transform hover:scale-105 hover:shadow-lg"
                    >
                      📎
                    </button>
                  </Tooltip>
                  <Tooltip text="根据描述生成图像">
                  <button
                    disabled={loading}
                    onClick={handleImageGenerate}
                    className={`h-full px-3 py-1 md:px-4 md:py-2 bg-blue-400 text-white rounded-full shadow hover:bg-blue-500 transform hover:scale-105 hover:shadow-lg text-xs md:text-sm`}
                  >
                    📝 图像生成
                  </button>
                  </Tooltip>
                </div>
                <div className="flex gap-1 md:gap-2">
                  <Tooltip text="语音输入">
                    <button
                      onClick={handleVoiceInput}
                      className="px-3 py-1 md:px-4 md:py-2 rounded-full shadow transform hover:scale-105 hover:shadow-lg text-sm md:text-base text-white bg-orange-400 hover:bg-orange-500"
                    >
                      {listening ? '🛑' : '🎤'}
                    </button>
                  </Tooltip>

                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    className={`px-3 py-1 md:px-4 md:py-2 rounded-full shadow transform hover:scale-105 hover:shadow-lg text-sm md:text-base text-white ${
                      !message.trim()
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-green-400 hover:bg-green-500'
                    }`}
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