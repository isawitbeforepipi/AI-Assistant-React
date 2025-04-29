import { useState } from 'react';

const roles = [
  { name: 'AI助手', emoji: '🤖' },
  { name: '医生', emoji: '🩺' },
  { name: '老师', emoji: '📚' },
  { name: '程序员', emoji: '💻' },
];

const Home: React.FC = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessages([...messages, message]);
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 to-blue-400 flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl">

        {/* 角色切换按钮（在顶部） */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-4 z-20">
          <div
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="bg-white shadow-lg rounded-full p-3 cursor-pointer transition-all duration-300 hover:bg-yellow-200"
          >
            <span className="text-xl">{selectedRole.emoji}</span>
          </div>
        </div>

        {/* 角色标签菜单 */}
        {showRoleMenu && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-48 bg-white shadow-xl rounded-lg p-4 space-y-2">
            {roles.map((role) => (
              <div
                key={role.name}
                onClick={() => {
                  setSelectedRole(role);
                  setShowRoleMenu(false);
                }}
                className={`flex items-center space-x-2 cursor-pointer transition-all duration-300 
                  ${selectedRole.name === role.name ? 'bg-yellow-400' : 'bg-white hover:bg-yellow-100'} 
                  rounded-full px-4 py-2`}
              >
                <span className="text-xl">{role.emoji}</span>
                <span className="text-sm text-gray-700">{role.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* 聊天框 */}
        <div className="w-full bg-white shadow-xl rounded-2xl h-[600px] flex flex-col p-6 mt-16">
          {/* 顶部标题 */}
          <div className="text-xl font-semibold mb-4 flex items-center space-x-2 text-gray-700">
            <span>{selectedRole.emoji}</span>
            <span>{selectedRole.name} 为你服务</span>
          </div>

          {/* 聊天内容 */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-400 text-sm text-center px-4">
                👋 你好，我是 {selectedRole.name}，很高兴见到你！
                <br />
                我可以帮你解答问题、提供建议、处理文件等，请告诉我你的任务吧~
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="flex justify-end">
                  <div className="bg-yellow-300 text-white px-4 py-2 rounded-full shadow">
                    {msg}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 输入框和按钮 */}
          <div className="relative bg-white border-2 border-gray-300 rounded-xl p-4 mt-6">
            <div className="flex flex-col space-y-2">
              {/* 输入框保持不变... */}
              <div className="flex-1 bg-transparent border-none outline-none rounded-full p-3 text-lg">
                <input
                  type="text"
                  className="w-full p-2 bg-transparent border-none outline-none rounded-full text-lg placeholder-gray-400"
                  placeholder="写点什么吧..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              {/*按钮区域*/}
              <div className="flex justify-between items-center mt-3">
                {/* 左侧按钮组 */}
                <div className="flex space-x-2">
                  {/* 文件上传按钮 */}
                  <button className="relative group flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-full shadow-md hover:bg-gradient-to-l hover:from-gray-500 hover:to-gray-400 transition duration-200">
                    <span className="text-lg">📎</span>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none whitespace-nowrap">
                      上传文件
                    </span>
                  </button>

                  {/* 快捷指令按钮组 */}
                  <div className="flex space-x-2">
                    <button className="relative group flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-full shadow-md hover:bg-gradient-to-l hover:from-blue-500 hover:to-blue-400 transition duration-200">
                      <span className="text-lg">📝</span>
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none whitespace-nowrap">
                        内容总结
                      </span>
                      <span className="ml-2 text-sm hidden sm:inline">总结</span>
                    </button>
                    <button className="relative group flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-500 text-white rounded-full shadow-md hover:bg-gradient-to-l hover:from-purple-500 hover:to-purple-400 transition duration-200">
                      <span className="text-lg">🌐</span>
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none whitespace-nowrap">
                        翻译内容
                      </span>
                      <span className="ml-2 text-sm hidden sm:inline">翻译</span>
                    </button>
                  </div>
                </div>

                {/* 右侧按钮组 */}
                <div className="flex space-x-2">
                  {/* 语音输入按钮 */}
                  <button className="relative group flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-full shadow-md hover:bg-gradient-to-l hover:from-orange-500 hover:to-orange-400 transition duration-200">
                    <span className="text-lg">🎤</span>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none whitespace-nowrap">
                      语音输入
                    </span>
                  </button>

                  {/* 发送按钮 */}
                  <button
                    onClick={handleSendMessage}
                    className="relative group flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-full shadow-md hover:bg-gradient-to-l hover:from-green-500 hover:to-green-400 transition duration-200"
                  >
                    <span className="text-lg">✈️</span>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none whitespace-nowrap">
                      发送消息
                    </span>
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
