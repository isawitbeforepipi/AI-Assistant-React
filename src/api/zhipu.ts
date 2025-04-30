export const getZhipuReply = async (messages: { role: string; content: string }[], retryCount = 2): Promise<string> => {
  try {
    const res = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4', // 或 glm-3-turbo
        messages,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return data.reply || '🤖 暂无回复';
  } catch (err) {
    if (retryCount > 0) {
      console.warn('请求失败，正在重试...', err);
      return getZhipuReply(messages, retryCount - 1);
    }
    console.error('请求失败：', err);
    return '⚠️ 获取回复失败，请稍后再试';
  }
};
