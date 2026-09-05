# EVKERK 主日学 AI 课程生成桥接

网站只负责课程结构、权限、审核与发布。司南或小光作为外部执行器负责生成内容。

固定流程：负责人在 `/team/` 提交经文、年龄、课时与重点 → 网站创建 `pending_executor` 任务 → 司南/小光使用 `SINAN_TOKEN` 拉取任务 → 执行器生成结构化页面并回传 → 网站保存为 `draft`，进入 `ready_for_review` → 负责人逐页预览/修改 → 批准后才变成 `published`。AI 永远没有直接发布权限。

## 拉取任务

`GET /api/sunday-school/ai/executor/pending?executor=sinan`

或：`GET /api/sunday-school/ai/executor/pending?executor=xiaoguang`

Header：`Authorization: Bearer <SINAN_TOKEN>`

返回的 `payload_json` 是生成合同，包括经文、年龄、课时、重点、规则和输出结构。

## 领取任务

`POST /api/sunday-school/ai/executor/requests/<REQUEST_ID>/start`

## 回传结果

`POST /api/sunday-school/ai/executor/requests/<REQUEST_ID>/complete`

示例：

```json
{
  "title": "民数记 9–12章：学习跟随神",
  "scripture": "民数记 9–12章",
  "summary": "本课帮助青少年理解神的引导、人的抱怨与顺服。",
  "pages": [
    {"page_type":"cover","title":"当神带路的时候","body":"民数记 9–12章"},
    {"page_type":"scripture","title":"云彩什么时候动？","scripture":"民数记 9:15–23","body":"从可靠经文源取得经文文本"},
    {"page_type":"question","title":"一起想一想","body":"如果你不知道神为什么让你等待，你通常会有什么反应？"},
    {"page_type":"music","title":"回应","body":"建议选择关于信靠、等候、跟随的歌曲。"}
  ]
}
```

允许页面类型：`cover`、`scripture`、`teaching`、`question`、`image`、`music`、`summary`、`prayer`。

AI 不能决定字体、字号、颜色、背景、Logo、页面尺寸和整体布局；这些由网站固定模板控制。

## 回传失败

`POST /api/sunday-school/ai/executor/requests/<REQUEST_ID>/fail`

Body：`{"error":"生成失败原因"}`

## 内容原则

- 只生成草稿，不直接发布。
- 不凭模型记忆伪造经文原文。
- 核心重点最多 3 个。
- 页面短而适合投影，不把长文章塞进一页。
- 避免单纯道德主义式应用，应用应回到福音与恩典。
- 音乐只提出主题或关键词，最终歌曲从教会已审核音乐库选择。
- 负责人拥有最终审核权。

人工标准课程、AI 草稿和老师本次授课副本共用同一页面模型，因此未来替换模型不会影响老师端。
