# DSH Sub2API 插件

独立安装、独立启停的 DeepSeek Harness Desktop 扩展。**这是社区自定义插件，并非 DeepSeek 官方插件。**

已验证环境：官方 **DSH Desktop 0.2.0-rc.2 / Windows x64**。其他系统尚未实机验证，升级 DSH 版本前请检查 peerDependencies 的兼容要求。

## 安装

在 DSH Desktop 左侧「插件」→ 安装，粘贴本仓库 Release 中的 `.tgz` 链接或下载后的本机绝对路径。

## 使用

这个插件把官方 Sub2API 的管理站点接入 DSH Desktop，并在 Host 侧负责健康检查、地址持久化和可选的本机进程托管。Sub2API 的数据库、Redis、账号和管理员登录仍由 Sub2API 自己管理；插件不会读取或保存管理员密码。

默认连接 `http://127.0.0.1:8080`。如果希望由 DSH 启动 Sub2API，可在插件配置中填写 `binaryPath`，并让该二进制使用独立的 `dataDirectory`；数据库和 Redis 仍需按官方部署文档配置。启用后从左下角「Sub2API」打开嵌入式管理页，窗口内的登录状态由 Sub2API 页面自己的 Cookie 管理。

## 兼容性

插件适配官方 Sub2API **0.2.15**，同时保留私有分支的扑克服务、后台扑克配置和 Sub2API Plugin API。DSH 的扑克（`@dsh-local/poker`）和局域网聊天（`@dsh-local/lan-chat`）插件接口不受影响，可同时安装。

## 开发

需要 Node.js 22+、pnpm，以及 0.2.0-rc.2 的官方 Desktop SDK：

```powershell
pnpm install --ignore-scripts --frozen-lockfile
node scripts/prepare-runtime.mjs
pnpm build
pnpm test
pnpm pack --pack-destination artifacts
```

`prepare-runtime.mjs` 默认只读解包 Windows 标准安装位置的 `resources/app.asar` 到被 Git 忽略的 `.runtime/`，不改官方应用。若已有解包 SDK，可将环境变量 `DSH_RUNTIME` 设为其中的 `dsh/node_modules` 目录。

源码变化后重新构建，提交 `lib/`，重新打包并发布新版本。

## 许可

MIT。打包依赖见 [第三方许可](THIRD_PARTY_NOTICES.txt)。
