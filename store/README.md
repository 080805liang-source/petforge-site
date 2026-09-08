# PET FORGE Microsoft Store 包

这个目录是面向所有 Windows 用户的免费分发路线：将现有桌宠核心包装成 MSIX，再提交 Microsoft Store。Store 认证后会重新签名，用户从商店安装时不会看到当前裸 EXE 的 SmartScreen 警告。

## 你需要先做的一次性步骤

1. 在 [storedeveloper.microsoft.com](https://storedeveloper.microsoft.com/) 用 Microsoft 账号注册开发者账号。新注册流程目前不收注册费，但需要本人身份证件和自拍完成身份验证。
2. 在 Partner Center 创建应用并保留名称，记下生成的 `Package/Identity/Name` 和 `Publisher`。
3. 在本机安装 Windows SDK，或运行仓库里的 GitHub Actions 工作流。构建时把上面两项传给 `store/build-msix.ps1`。
4. 将生成的 `store/artifacts/*.msix` 上传到 Partner Center，填写截图、隐私政策和年龄分级，提交认证。

## 本地构建

```powershell
pwsh -File .\store\build-msix.ps1 `
  -PackageName "从 Partner Center 复制的 Identity Name" `
  -Publisher "从 Partner Center 复制的 Publisher" `
  -Version "1.0.0.0"
```

脚本只负责打包，不会生成假证书，也不会修改 Defender 或 SmartScreen。MSIX 在提交商店前可以不签名；不要把自签名包当作公开发布包。
