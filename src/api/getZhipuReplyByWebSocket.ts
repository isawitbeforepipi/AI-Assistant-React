// src/api/getZhipuReplyByWebSocket.ts
export function getZhipuReplyByWebSocket(
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  onMessage: (partial: string) => void,
  onDone: () => void,
  onError: (err: any) => void
) {
  const ws = new WebSocket('wss://accurate-martha-isawitbeforepipi-4d92e84d.koyeb.app');

  ws.onopen = () => {
    ws.send(JSON.stringify({ messages: chatHistory }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.error) {
        onError(data.error);
        ws.close();
        return;
      }
      if (data.done) {
        onDone();
        ws.close();
      } else if (data.content) {
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

  ws.onclose = () => {
    // console.log('WebSocket closed');
  };
}
