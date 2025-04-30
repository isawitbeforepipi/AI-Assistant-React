import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import http from "http";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
    let parsed;
    try {
      parsed = JSON.parse(message.toString());
    } catch (err) {
      console.error("消息格式错误:", err); // 打印错误
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ error: "消息格式错误" }));
      }
      return;
    }

    const { messages } = parsed;

    try {
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

      if (!response.ok) {
        console.error(`API 请求失败，状态码: ${response.status}`); // 打印错误
        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              error: `API 请求失败，状态码: ${response.status}`,
            })
          );
        }
        return;
      }

      if (!response.body) {
        console.error("API 响应体为空");
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ error: "API 响应体为空" }));
        }
        return;
      }

      // 处理 API 响应数据
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const timeout = setTimeout(() => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ error: "响应超时" }));
        }
      }, 30000); // 30 秒超时保护

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // 处理完完整的行，保留未完成部分

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.replace("data: ", "").trim();
              if (jsonStr === "[DONE]") {
                // 完成后继续监听消息，而不是关闭连接
                if (ws.readyState === ws.OPEN) {
                  ws.send(JSON.stringify({ done: true }));
                }
                clearTimeout(timeout);
                return;
              }

              try {
                const data = JSON.parse(jsonStr);
                const content = data.choices?.[0]?.delta?.content;
                if (content && ws.readyState === ws.OPEN) {
                  ws.send(JSON.stringify({ content }));
                }
              } catch (err) {
                console.error("解析数据错误:", err); // 打印解析错误
                // 忽略错误
              }
            }
          }
        }
      } catch (err) {
        console.error("读取响应数据时发生错误:", err); // 打印读取错误
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ error: "服务端异常" }));
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      console.error("请求处理失败:", err); // 打印请求处理失败错误
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ error: "请求处理失败" }));
      }
    }
  });

  ws.on("close", () => {
    console.log("WebSocket 已关闭");
  });
});

server.listen(3001, () => {
  console.log("✅ WebSocket 服务运行在 ws://localhost:3001");
});
