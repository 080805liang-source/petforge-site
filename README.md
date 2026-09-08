# PET FORGE

公开访问地址：https://080805liang-source.github.io/petforge-site/

这是一个用于创建个人 Windows 桌宠的网站。网站没有预设角色：用户必须先上传自己的图片，才会出现预览和生成入口。

当前能力：

- 3D 创作台与无预设角色的首次状态
- 图片上传与实时预览
- 桌宠名字、点击台词、大小、透明度、状态、动画、气泡、初始位置调整
- 用户自定义多个快捷入口
- 导出制作配置 JSON
- 在浏览器端生成包含 Windows 应用的 zip 桌宠包

当前网站生成的是便携 ZIP，包含 `PetForge.exe`，解压后双击即可运行，不需要安装 Python。由于这个 ZIP 内的 EXE 目前没有受信任的发行者签名，其他用户首次运行可能看到 Windows SmartScreen 提示；网站不能合法替所有用户关闭该提示。

面向所有用户的免费公开分发正在准备 Microsoft Store MSIX 路线：商店认证后会自动重新签名。清单模板、打包脚本和 GitHub Actions 工作流见 `store/`。发布前仍需要站长本人完成免费的 Microsoft 开发者账号身份验证、保留应用名称并提交商店审核。
