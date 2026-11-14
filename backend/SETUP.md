# 邮箱密码账号与收藏夹同步（待启用）

项目：daily-classics / kipzdaglxobbcrnqmqlz。数据库和 RLS 已创建，保持现有 collections.sql。

## 已实现

邮箱密码注册/登录；通过邮件确认账号；忘记密码与 PASSWORD_RECOVERY 回调设置新密码。
未登录继续本机收藏；登录后账号隔离；显式导入并去重；退出恢复本机收藏。
前台每15秒、重新打开页面及恢复网络时刷新。版本检查拒绝旧数据覆盖新数据。

## 开放注册前必须完成

1. 配置可用的自定义 SMTP，使用免费额度内的邮件服务或支持少量自动邮件的自有邮箱。内置 Supabase 邮件服务只面向项目成员测试，不适合公众注册。
2. SMTP 凭据只保存在 Supabase 管理后台；不得写入网页、仓库或聊天。若使用第三方免费邮件服务，验证其发件身份/域名要求，不保证域名本身免费。
3. Auth Email provider 开启，Confirm email 保持开启。配置密码长度至少10位、邮件发送速率限制。未使用短信服务，无需阿里云 PNVS。
4. Site URL 与允许重定向地址均设为 https://wddygjsmmz.github.io/daily-classics/ 。静态网站使用 SDK implicit 回调；邮件模板使用 Supabase ConfirmationURL，密码重置事件展示新密码表单。
5. 真实测试两个邮箱的注册、验证、密码错误、找回密码、重置链接过期和两台设备同步。测试未登录、退出、账号切换、并发冲突、邮件发送限制。公共上线前按需要接入服务端支持的人机验证。
6. 全部通过后将 auth-config.js enabled 改为 true，合并发布。目前 enabled=false，线上版本未更改。

## 验证

前端语法检查通过。tests/account.test.cjs 模拟 SDK 验证本机/账号隔离、导入、冲突恢复、退出，以及邮箱注册/重置请求/恢复表单。
数据库事务断言验证本人写入、拒绝匿名和跨账号访问、版本冲突、数据结构限制；security advisors 无警告。测试账号均已回滚。
未配置发件服务，未发送真实注册邮件，未做真实双设备认证测试。

资料：
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
