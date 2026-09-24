# PET FORGE 群 AI 机器人

这是一个独立的群机器人服务，运行目录在 `D:\网站计划\qq-ai-bot`。

默认行为：

- 只有被 `@机器人` 或以 `/ai` 开头时才回复，避免在群里刷屏。
- 同一用户默认 2.5 秒冷却，限制重复请求。
- 每个群保存有限的上下文，不保存密码、Cookie 或 QQ 登录信息。
- AI 密钥只放在服务器的 `.env`，不会进入网页或 GitHub。
- `GET /health` 可检查服务是否在线，`POST /events` 接收已经标准化的群消息事件。

## 运行

```powershell
cd D:\网站计划\qq-ai-bot
Copy-Item .env.example .env
node src/server.js
```

现在这个目录已经包含 AI 回复核心和安全限流。接入 QQ 前还需要在 QQ 官方机器人平台创建机器人应用，并把平台提供的 AppID、AppSecret、机器人 ID 和事件回调配置到服务端。不要把 QQ 个人账号密码交给机器人。

## 标准事件格式

QQ 适配器把群消息转换为以下 JSON，再调用 `POST /events`：

```json
{
  "type": "group_message",
  "groupId": "群号或群标识",
  "userId": "发送者标识",
  "userName": "发送者昵称",
  "message": "@PET FORGE AI 你好",
  "botMentioned": true,
  "messageId": "平台消息 ID"
}
```

官方平台的 AppID、AppSecret、回调签名和可用群消息权限需要由机器人所有者本人在平台侧完成。完成后再把适配器接到官方事件网关，避免使用高风险的个人 QQ 模拟登录方案。
