// src/api/getZhipuReplyByWebSocket.ts

export function getZhipuReplyByWebSocket(
  chatHistory: { role: 'user' | 'assistant'; content: string }[], //消息数组
  onMessage: (partial: string) => void, //每当接收到来自服务器的消息时会被调用
  onDone: () => void,  //成功回调，当 WebSocket 连接完成并且服务器发送完毕时调用。
  onError: (err: any) => void  //失败回调
) {
  const wsUrl = import.meta.env.VITE_BACKEND_WS_URL;
  //创建WebSocket连接
  const ws = new WebSocket(wsUrl);
  
  //连接打开时的事件处理函数 
  ws.onopen = () => {
    //向服务器发送数据，启动交互
    ws.send(JSON.stringify({ messages: chatHistory }));
  };
  //WebSocket连接收到服务器消息时，onmessage 被触发
  ws.onmessage = (event) => {
    try {
      //解析服务器发送过来的数据
      const data = JSON.parse(event.data);
      if (data.error) {
        onError(data.error);
        ws.close();
        return;
      }
      if (data.done) {
        onDone();
        ws.close();
      } else if (data.content) {  //部分响应
        onMessage(data.content);
      }
    } catch (err) {
      onError(err);
      ws.close();
    }
  };

  ws.onerror = (err) => {
    onError(err);
  };
  
  //连接关闭
  ws.onclose = () => {
    // console.log('WebSocket closed');
  };
}
