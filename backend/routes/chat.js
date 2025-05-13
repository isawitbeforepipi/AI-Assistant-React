import { WebSocketServer } from "ws";
import dotenv from "dotenv";
dotenv.config();

//WebSocket 服务器的入口函数
export function setupWSServer(server) {
  //WebSocket 服务器实例
  const wss = new WebSocketServer({ server });

  //当有客户端通过 WebSocket 连接时触发
  wss.on("connection", (ws) => {
    ws.on("message", async (message) => {
      await handleChatMessage(ws, message);
    });

    ws.on("close", () => {
      // console.log("WebSocket closed");
    });
  });
}

export async function handleChatMessage(ws, message) {
  try {
    const parsed = JSON.parse(message.toString());
    const { messages } = parsed;

    // 流式处理，数据以数据块的形式返回
    const stream = await processLLMRequest(messages);
    // for await是用来迭代异步生成器的语法
    // 每次从生成器中获取一个结果（每次执行 yield），并等待下一个数据块。这样客户端就可以接收到分批的、实时的响应数据。
    for await (const chunk of stream) {
      //如果ws连接是打开的，就把数据块发给客户端
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(chunk));
      }
    }
    //当所有数据都发送完时，通知客户端任务完成。
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

//异步生成器函数，用于与 Zhipu API 进行交互，获取流式响应。
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

  //响应体的读取器，按块（chunk）获取响应数据
  const reader = response.body.getReader();
  //将二进制数据转换为文本
  const decoder = new TextDecoder();

  try {
    //不断地从流中读取数据，直到数据结束
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        //如果一行以 data: 开头，说明这部分数据包含有效内容
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.replace("data: ", "").trim();
        //如果返回 [DONE]，表示所有数据已返回，生成器停止。
        if (jsonStr === "[DONE]") return;

        try {
          const data = JSON.parse(jsonStr);
          //每次从 API 获取到一部分内容后，就通过 yield 返回给调用者。这是一个流式响应过程，逐步返回内容。
          // choices 是一个包含多个响应选项的数组，通常每个选项代表模型根据同一输入生成的不同响应。
          // delta代表当前响应的增量部分，也就是我们需要返回的流式数据
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
