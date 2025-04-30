import WebSocket from "ws";

// 连接到 WebSocket 服务器
const ws = new WebSocket("ws://localhost:3001");

// 当连接建立时，发送测试消息
ws.on("open", () => {
  console.log("连接到 WebSocket 服务器");

  const testMessage = {
    messages: [
      { role: "user", content: "你好，AI" },
      { role: "assistant", content: "你好！请问有什么可以帮忙的吗？" },
    ],
  };

  // 发送消息到后端
  ws.send(JSON.stringify(testMessage));
});

// 接收服务器响应
ws.on("message", (data) => {
  // 检查是否为 Buffer 数据
  const response = data instanceof Buffer ? data.toString() : data;

  console.log("收到服务器响应:", response);

  // 关闭连接
  ws.close();
});

// 处理连接关闭
ws.on("close", () => {
  console.log("WebSocket 连接已关闭");
});

// 处理错误
ws.on("error", (error) => {
  console.error("WebSocket 错误:", error);
});
