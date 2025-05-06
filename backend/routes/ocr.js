import express from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

const AK = process.env.BAIDU_OCR_API_KEY;
const SK = process.env.BAIDU_OCR_SECRET_KEY;

// 获取百度 access_token
async function getAccessToken() {
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${AK}&client_secret=${SK}`;
  try {
    const res = await axios.post(url);
    return res.data.access_token;
  } catch (err) {
    throw new Error("获取 access_token 失败：" + err.message);
  }
}
router.post("/", async (req, res) => {
  const { image } = req.body; // 获取 base64 编码的图片
  if (!image) {
    return res
      .status(400)
      .json({ error: "请提供 image 字段（base64 编码的图片）" });
  }

  try {
    const accessToken = await getAccessToken();
    const result = await axios.post(
      `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${accessToken}`,
      new URLSearchParams({
        image: image, // 直接传递 base64 编码的图片
        detect_direction: "false",
        paragraph: "false",
        probability: "false",
        multidirectional_recognize: "false",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
