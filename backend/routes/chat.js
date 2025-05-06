import { WebSocketServer } from "ws";
import dotenv from "dotenv";
dotenv.config();

export function setupWSServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    ws.on("message", async (message) => {
      await handleChatMessage(ws, message);
    });

    ws.on("close", () => {
      // console.log("WebSocket closed");
    });
  });
}

export async function* processLLMRequest(messages) {
  const response = await fetch(
    "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: "glm-3-turbo",
        stream: true,
        messages,
      }),
    }
  );

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.replace("data: ", "").trim();
        if (jsonStr === "[DONE]") return;

        try {
          const data = JSON.parse(jsonStr);
          yield {
            content: data.choices?.[0]?.delta?.content || "",
          };
        } catch (err) {
          console.error("JSON解析错误:", err);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function handleChatMessage(ws, message) {
  try {
    const parsed = JSON.parse(message.toString());
    const { messages } = parsed;

    // 流式处理
    const stream = await processLLMRequest(messages);
    for await (const chunk of stream) {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(chunk));
      }
    }

    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ done: true }));
    }
  } catch (err) {
    handleWSError(ws, err);
  }
}

function handleWSError(ws, error) {
  console.error("WebSocket Error:", error);
  if (ws.readyState === ws.OPEN) {
    ws.send(
      JSON.stringify({
        error: error.message || "处理请求时发生错误",
      })
    );
  }
}
