import { useState } from 'react';

const Home: React.FC = ()=>{
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<string[]>([]);

  // 处理发送消息
  const handleSendMessage = () => {
    if (message.trim()) {
      setMessages([...messages, message]);  // 将新消息添加到消息列表
      setMessage('');  // 清空输入框
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-200 to-blue-400 p-4">
      <div className="w-full max-w-xl p-6 bg-white shadow-xl rounded-2xl transform hover:scale-105 transition duration-300">
        <div className="space-y-4">
          {/* Chat List */}
          <div className="space-y-3 overflow-y-auto max-h-80">
            {messages.map((msg, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-400 text-white rounded-full flex items-center justify-center text-lg font-semibold">
                  A
                </div>
                <div className="max-w-xs p-3 bg-white rounded-lg shadow-lg text-gray-700 text-sm">
                  {msg}
                </div>
              </div>
            ))}
          </div>

          {/* Input Box */}
          <div className="flex flex-col sm:flex-row mt-4">
            <input
              type="text"
              className="flex-grow p-3 border-2 border-gray-300 rounded-l-full rounded-r-full mb-2 sm:mb-0 sm:mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="我是一个AI小助手，请写下你的问题吧~"
            />
            <button
              className="px-6 py-3 bg-yellow-400 text-white rounded-full shadow-md hover:bg-yellow-500 focus:outline-none transform transition duration-300"
              onClick={handleSendMessage}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
