const sessions = new Map();
const cooldowns = new Map();

const numberEnv = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

function configFrom(env = process.env) {
  return {
    apiUrl: env.AI_API_URL || "https://api.openai.com/v1/chat/completions",
    apiKey: env.AI_API_KEY || "",
    model: env.AI_MODEL || "",
    botName: env.BOT_NAME || "PET FORGE AI",
    prefix: env.BOT_PREFIX || "/ai",
    cooldownMs: numberEnv(env.BOT_COOLDOWN_MS, 2500),
    maxHistory: Math.min(numberEnv(env.BOT_MAX_HISTORY, 12), 30)
  };
}

function shouldReply(event, config) {
  if (event?.type !== "group_message") return false;
  const message = String(event.message || "").trim();
  return Boolean(event.botMentioned) || message.toLowerCase().startsWith(config.prefix.toLowerCase());
}

function cleanPrompt(message, config) {
  return String(message || "")
    .replace(/<@!?[^>]+>/g, "")
    .replace(config.prefix, "")
    .trim();
}

function sessionKey(event) {
  return `${event.groupId || "unknown"}:${event.userId || "unknown"}`;
}

async function askAI(prompt, history, config, fetchImpl = fetch) {
  if (!config.apiKey || !config.model) throw new Error("AI_API_KEY 或 AI_MODEL 尚未配置。");
  const response = await fetchImpl(config.apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.7,
      max_tokens: 700,
      messages: [
        { role: "system", content: `你是 ${config.botName}，在 QQ 群里回答问题。回答简洁、友好，不要刷屏，不要编造自己能执行的操作。` },
        ...history,
        { role: "user", content: prompt }
      ]
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `AI 服务返回 HTTP ${response.status}`);
  const answer = data.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("AI 服务没有返回可发送的内容。");
  return answer.slice(0, 1800);
}

export function createReplyEngine({ env = process.env, fetchImpl = fetch } = {}) {
  const config = configFrom(env);
  return {
    config,
    async handle(event, sendGroupMessage) {
      if (!shouldReply(event, config)) return { handled: false, reason: "not_triggered" };
      const key = sessionKey(event);
      const last = cooldowns.get(key) || 0;
      if (Date.now() - last < config.cooldownMs) return { handled: false, reason: "cooldown" };
      const prompt = cleanPrompt(event.message, config);
      if (!prompt) return { handled: false, reason: "empty_prompt" };
      const history = sessions.get(key) || [];
      const answer = await askAI(prompt, history, config, fetchImpl);
      const nextHistory = [...history, { role: "user", content: prompt }, { role: "assistant", content: answer }];
      sessions.set(key, nextHistory.slice(-config.maxHistory));
      cooldowns.set(key, Date.now());
      await sendGroupMessage(event.groupId, answer, event);
      return { handled: true, answer };
    }
  };
}

export { cleanPrompt, configFrom, shouldReply };
