# 手机号账号与收藏夹同步（待启用）

Supabase project: `daily-classics` / `kipzdaglxobbcrnqmqlz`（新加坡）。
数据库 `collections.sql` 已通过迁移应用；本目录保留可审核的同版 SQL。
`auth-config.js` 的 `enabled` 当前为 `false`。短信通路及端到端测试完成之前不要改为 true。

## 已实现

- +86 手机号短信验证码注册/登录界面，Supabase 会话管理、退出与账号切换。
- 游客继续使用 `riting.collections.v1`，不自动上传本机收藏。
- 登录后只读取当前账号数据；明确点击导入后同名文件夹合并、曲目去重。
- 返回页面、恢复网络及前台每 15 秒拉取云端收藏夹。
- 云端写入使用版本比较；并发修改拒绝旧版本覆盖，提示重新同步再操作。
- 离线时云端写入不假报成功。退出后恢复本机收藏，不把账号收藏留作游客数据。
- 数据库按 auth.uid 隔离，匿名无权限。RPC 使用 SECURITY INVOKER。
- Supabase JS 固定为 2.119.0，CDN 资源使用 SHA-384 integrity 校验。

## 开通短信的剩余步骤

1. 在阿里云开通 **号码认证服务（PNVS）里的短信认证**，完成该平台要求的个人认证。不要误购普通短信服务 SMS 的套餐包，两者额度不互通。
2. 使用 PNVS 提供的注册/登录签名和模板，核对模板参数。按照实际费用开通/充值；本次没有购买短信套餐或发送短信。
3. 创建只允许 `dypns:SendSmsVerifyCode` 的服务器调用凭据。AccessKey Secret 仅存放 Supabase Edge Function Secrets；禁止写入本仓库、网页或聊天。
4. 实现并部署 Supabase Send SMS Hook：验证 Standard Webhooks 签名和时间戳，仅接受 +86 手机号；调用 `SendSmsVerifyCode`，把 Supabase 生成的 `sms.otp` 作为模板验证码原样发送。由 Supabase 验证 OTP，不再通过阿里云 CheckSmsVerifyCode 验证自定义验证码。函数不得记录手机号或验证码。
5. 配置 Supabase Phone provider 和 Send SMS Hook，保持手机验证开启，不启用自动确认号码。OTP 有效期及模板显示一致（建议 5 分钟），6 位数字，至少 60 秒发送间隔。配置服务端发送上限、验证码验证限制与短信费用告警；公共上线前按实际配置接入人机验证。
6. 在两台设备验证：注册、已有账号登录、错误/过期验证码、发送限制、收藏夹创建/增删/导入、并发冲突、退出和换号隔离。还需验证大陆实际网络可访问 Supabase 与 SDK CDN。
7. 通过验证后开启配置并合并发布 GitHub Pages。若依赖加载失败，应继续明确提示本机模式，不能声称云端已同步。

## 验证记录

- `node --check app.js` / `node --check account.js` 通过。
- `node tests/account.test.cjs`：本机保存、登录读取、显式导入、本机数据保留、冲突恢复、退出/换号隔离通过（模拟 SDK）。
- Supabase 数据库事务断言：本人可写；旧版本写入返回空；其他账号无法读取、更新、插入所属记录；匿名读取/RPC 权限关闭；重复收藏夹名拒绝。
- 所有数据库测试用户在同一事务回滚，不留下测试账号。
- Supabase security advisors 无警告。
- **未完成**：真实短信发送、浏览器登录与两台设备端到端验证。当前不能作为已上线功能交付。

## 官方资料

- https://supabase.com/docs/guides/auth/phone-login
- https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
- https://help.aliyun.com/zh/pnvs/use-cases/sms-verify-for-individual-developers
- https://help.aliyun.com/zh/pnvs/developer-reference/api-dypnsapi-2017-05-25-sendsmsverifycode
