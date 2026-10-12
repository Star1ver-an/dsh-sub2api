export const zh = {
  title: 'Sub2API', description: '在 DSH Desktop 中连接并管理本机或远程 Sub2API', trigger: 'Sub2API',
  panelTitle: 'Sub2API 管理台', close: '收起 Sub2API', url: '服务地址',
  urlHint: '填写 Sub2API 的网页地址，例如 http://127.0.0.1:8080。', save: '保存并检测',
  starting: '正在启动…', checking: '正在检测…', ready: '已连接', offline: '无法连接', notConfigured: '尚未配置',
  binary: '本机二进制路径（可选）', binaryHint: '填写后可由 DSH 启动 Sub2API；数据库和 Redis 仍按官方文档配置。',
  start: '启动服务', stop: '停止服务', openExternal: '在浏览器打开', reload: '重新加载',
  embedBlocked: '如果内嵌页面被服务端安全策略拦截，请使用“在浏览器打开”。', healthError: '健康检查失败：{message}',
} as const
export const en = {
  title: 'Sub2API', description: 'Connect and manage a local or remote Sub2API from DSH Desktop', trigger: 'Sub2API',
  panelTitle: 'Sub2API Console', close: 'Close Sub2API', url: 'Service URL',
  urlHint: 'Enter the Sub2API web URL, for example http://127.0.0.1:8080.', save: 'Save and check',
  starting: 'Starting…', checking: 'Checking…', ready: 'Connected', offline: 'Unavailable', notConfigured: 'Not configured',
  binary: 'Local binary path (optional)', binaryHint: 'When set, DSH can start Sub2API. Configure PostgreSQL and Redis as documented upstream.',
  start: 'Start service', stop: 'Stop service', openExternal: 'Open in browser', reload: 'Reload',
  embedBlocked: 'If the embedded page is blocked by the server security policy, use “Open in browser”.', healthError: 'Health check failed: {message}',
} as const
export type Sub2ApiKey = keyof typeof zh
