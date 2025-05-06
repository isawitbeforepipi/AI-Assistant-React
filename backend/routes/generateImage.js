import express from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const API_KEY = process.env.GENERATE_IMG_API_KEY;

// 提交生成任务
router.post("/submit", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "请提供 prompt 字段" });
  }

  try {
    // 向 DashScope API 提交图像生成任务（启用异步处理）
    const result = await axios.post(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
      {
        model: "wanx2.1-t2i-turbo",
        input: { prompt },
        parameters: {
          size: "512*512",
          n: 1,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
          "X-DashScope-Async": "enable", // 启用异步处理
        },
      }
    );

    // 获取生成任务的 taskId
    const taskId = result.data?.output?.task_id;
    if (taskId) {
      res.json({ taskId });
    } else {
      res.status(500).json({ error: "未获取到 task_id", detail: result.data });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 将图像 URL 转换为 Base64 字符串
const urlToBase64 = async (url) => {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  const base64 = Buffer.from(response.data, "binary").toString("base64");
  const contentType = response.headers["content-type"];
  return `data:${contentType};base64,${base64}`;
};
router.get("/result/:taskId", async (req, res) => {
  const { taskId } = req.params;
  if (!taskId) {
    return res.status(400).json({ error: "缺少 taskId 参数" });
  }

  try {
    const result = await axios.get(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    const taskStatus = result.data?.output?.task_status;
    const imageUrls = result.data?.output?.results?.map((r) => r.url) || [];

    if (taskStatus === "SUCCEEDED" && imageUrls.length > 0) {
      const base64Images = await Promise.all(imageUrls.map(urlToBase64));
      return res.json({
        status: "SUCCEEDED",
        images: imageUrls,
        base64Images,
      });
    } else if (taskStatus === "FAILED") {
      return res.json({ status: "FAILED" });
    } else {
      // RUNNING、PENDING 等状态，继续轮询
      return res.json({ status: taskStatus });
    }
  } catch (err) {
    console.error("❌ 查询任务出错:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
