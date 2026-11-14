# 私人同步码

现行方案不使用邮箱、手机或 Supabase Auth。前端 private-sync.js 用 Web Crypto 生成 256-bit 随机码，格式 DC1- + 64位小写十六进制。
通过 HTTPS Authorization 请求头交给 classics-sync Edge Function。函数计算 SHA-256 并查找对应空间；数据库只存摘要，不存原始码。不得将同步码放入 URL、日志或分析事件。

部署项目 kipzdaglxobbcrnqmqlz；Edge Function classics-sync，verify_jwt=false，因为函数自行校验私人同步码。服务端密钥仅使用 Edge Function 的内置环境变量，不进入浏览器。数据库及 RPC 不向 anon/authenticated 授权，并有明确拒绝策略；SECURITY INVOKER RPC 只授权给 service_role。

SQL 依赖顺序：collections.sql（历史账号方案的验证函数，已有表保留）；private-sync.sql。部署 Edge 源码 backend/index.ts。生产迁移已应用，不要重复执行建表脚本。

创建显式导入本机收藏；连接已有码不上传本机数据，用户可再选择合并。明文同步码保存在本机 localStorage，可查看/复制；共享设备应退出。没有手机号/邮箱找回，也不证明真实身份。持码者可读写同一空间。

每个空间限制 JSON 文本64 KiB；每个IP摘要每5分钟最多300次请求、每小时最多创建5个空间，全站每天创建100个空间。IP只存与服务端密钥结合后的摘要，限流桶自动清理。IP限流依赖网关转发头，不替代平台级滥用防护。超额返回429，不自动升级付费。

前台每60秒、页面恢复可见和网络恢复时读取；保存立即发送。版本比较返回409时拒绝覆盖，提示先重新同步。离线不排队，不假报已保存。退出保留浏览器原有本机收藏。

验证：Node 模拟双设备、退出/错误码隔离、冲突、离线；真实HTTPS API测试创建/读取/写入、错码拒绝、旧版本冲突、结构校验；数据库权限断言；发布后浏览器UI验证。真实API测试只生成可丢弃的测试空间。
