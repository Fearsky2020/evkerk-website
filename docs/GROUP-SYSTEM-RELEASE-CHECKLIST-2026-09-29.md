# EVKERK 小组系统发布前 Checklist

日期：2026-09-29  
状态：PREPARED / NOT RELEASED

## 0. 强制边界

- 所有执行通过 SINAN RDC。
- 不使用 `scripts/bootstrap-cloudflare.ps1`：该脚本会重新生成并覆盖 `SINAN_TOKEN` 与 `INGEST_TOKEN`，本次发布不需要重置生产 secrets。
- 不使用 `scripts/deploy-on-church-pc.ps1`：它包含 bootstrap 和其它基础设施动作，范围过大。
- 不清理或覆盖历史未提交文件。
- 未经明确批准：不 apply production migration、不 deploy Worker、不上传 TestFlight。

## 1. 已完成发布前验收

### Backend
- 小组 / 会友 / 新人相关完整测试：93/93 PASS
- 组织权限专项：55/55 PASS
- `src/organization.js` syntax PASS
- `public/team/groups/app.js` syntax PASS
- `public/team/groups/governance.js` syntax PASS
- Branch: `feat/group-member-join-v1`
- HEAD: `ecef6e8da70ace567c1b8ea74dd4703921378e9e`

### iOS
- Protected QA: `EVKERK_IOS_GROUP_FINAL=PASS`
- Simulator: iPhone 18 Pro
- Branch: `main`
- HEAD: `498e174d15441643182533fef994a3d12c9ea1c8`
- Release authorized: false

## 2. Migration 审计

发布涉及：
- `0031_group_member_join_target.sql`
- `0032_group_join_invites.sql`
- `0033_group_life_home.sql`
- `0034_joint_group_meeting_points.sql`
- `0035_group_prayer_submission.sql`
- `0036_group_weekly_scripture.sql`

已确认：
- 0033 先创建 `group_prayer_items`，0035 再扩展幂等/处理字段。
- 0034 独立增加联合小组聚会点。
- 0036 增加本周经文/讨论主题。
- `requested_group_id`、`welcome_message`、`group_kind`、`weekly_scripture_reference`、`weekly_scripture_text`、`discussion_theme` 无前置重复列。
- 其它表出现的 `client_request_id` 与 0035 不属于同一表，不冲突。

## 3. Backend 发布最小路径

### Step A — 发布前只读确认
必须确认：
- home-01 live RDC usable。
- 当前目录仍是 `C:\SINAN\workspace\evkerk-login-fix`。
- branch / HEAD 未意外变化。
- `wrangler.toml` 仍绑定：
  - domain: `evkerk.nl`, `www.evkerk.nl`
  - D1: `evkerk-website-db`
  - D1 id: `2817f829-f9d3-4426-b35c-f8eb21b6b934`
  - R2: `evkerk-website-media`

任何一项不一致：STOP。

### Step B — 本地最终检查
执行：
- `npm run check`
- `npm test`

任一失败：STOP，不碰生产。

### Step C — Production D1 migrations
只使用 Cloudflare migration tracking：
- `wrangler d1 migrations apply evkerk-website-db --remote`

不要手工逐条执行 SQL，不要跑 bootstrap。

要求：
- 只应用尚未记录的 migration。
- migration 返回失败：STOP，不 deploy Worker。
- 若 D1 migration 已成功而 Worker 尚未 deploy，则旧 Worker 必须保持可运行；后续只处理 Worker 发布，不重复手工改 DB。

### Step D — Worker deploy
migration 成功后才执行：
- `wrangler deploy`

不要使用 bootstrap / deploy-on-church-pc。

要求：
- deploy 失败：STOP。
- 不改 secrets。
- 不重启 SINAN / QQ / media worker。

### Step E — Production smoke
首先运行现有无写入 smoke：
- `scripts/smoke-test.ps1 -Endpoint "https://evkerk.nl"`

然后增加小组系统专项只读 smoke：
- `GET /api/health`
- `GET /.well-known/apple-app-site-association`
- 邀请链接 fallback 页面可访问
- 未登录访问受保护 organization API 必须 401/403
- 公开 `/api/app/groups` 正常
- 不创建真实成员、不创建真实新人、不生成真实邀请 token。

任一 smoke 失败：STOP，进入 Worker 回滚。

## 4. Backend 回滚原则

### Worker 回滚
优先恢复上一稳定 Worker 版本/上一稳定代码，不修改 D1 数据。

### D1
0031–0036 都是增量新增列/表/索引。
发布失败时默认 **不做破坏性 down migration**。
保留新增 schema，让旧 Worker 忽略新字段，比 DROP COLUMN / DROP TABLE 更安全。

### Secrets
本次发布绝不轮换 secrets，因此无需 secret rollback。

## 5. Universal Link 生效条件

Worker 发布后必须确认：
- `https://evkerk.nl/.well-known/apple-app-site-association` 返回 200
- Content-Type 为 JSON
- 不重定向
- appID: `CU2U35ZD7K.nl.evkerk.app`
- path/component 限定 `/join/*`

未发布新 iOS 包前，现有线上 App 不会自动获得新的 Associated Domains 能力。
网页 `join.html` fallback 始终保留。

## 6. iOS 发布顺序

仅在 Backend production smoke 全部 PASS 后：

1. 重新运行 `evkerk-ios-group-final-v1`
2. 确认 `EVKERK_IOS_GROUP_FINAL=PASS`
3. 核对：
   - `EvkerkApp.entitlements`
   - `project.pbxproj`
   - `RootView.swift`
   - `AppSession.swift`
   - `ProfileView.swift`
   - `OrganizationWorkspaceView.swift`
4. 不夹带 Bible / Songs / Devotional 历史未提交改动进入小组发布包。
5. 只有明确批准后才进入 TestFlight release profile / archive / upload。

## 7. iOS 生产验收重点

TestFlight 安装后验证：
- 普通会友加入小组。
- 邀请二维码打开 App 并预选指定小组。
- 未装 App 时网页 fallback 正常。
- 申请仍需组长审批，不自动入组。
- 普通组员仅一个 active group。
- “我的小组”显示本周经文/讨论主题。
- 本周经文可进入对应书卷/章节。
- 小组长仅管理直属小组。
- 大组长非直属子小组仅显示运行概况，不能进入完整详情。
- 牧者全局权限正常。
- welcome 必须显式授权。
- 无 welcome 权限不显示新人入口/待处理新人数字。
- 联合小组第五周不自动猜测聚会点。

## 8. 当前明确禁止夹带的 iOS 历史改动

当前 worktree 还有历史未提交内容，包括：
- `BibleLibraryView.swift`
- `SongsView.swift`
- Bible resource part1–5
- Devotional / Bible 相关 QA backup 文件
- 其它历史 `.sinan/qa` 文件

发布小组系统时必须单独审计，不能因为“当前 worktree build PASS”就默认全部一起提交/发布。

## 9. 发布门

当前状态：
- Backend tests: PASS
- iOS protected QA: PASS
- Production migration: NOT RUN
- Worker deploy: NOT RUN
- Production smoke: NOT RUN
- TestFlight: NOT UPLOADED

只有用户明确批准“发布后端”后，才能从 Step A 开始生产动作。
只有 Backend production smoke PASS 且用户明确批准 TestFlight 后，才能上传 iOS。
