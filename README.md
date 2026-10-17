# ixl-auto-answer

通过自选大模型 API 辅助完成 IXL 英语练习的 Tampermonkey 脚本。

支持单选、多选、正文点选、表格分类、事件排序和问题解决方案配对。提供单题建议、单题作答、连续作答及停止按钮。

## 使用

1. 安装 Tampermonkey，然后[安装脚本](https://raw.githubusercontent.com/oyasumidev1/ixl-auto-answer/main/ixl-auto-answer.user.js)。
2. 打开 `https://uk.ixl.com/english/*` 下的练习页。
3. 填写协议、完整 API URL、Key 和模型，保存后先点“获取建议”。

协议支持 OpenAI Chat Completions、Responses、Anthropic Messages。例如 Chat Completions 的完整地址为 `https://你的服务/v1/chat/completions`。支持思考强度设置，具体取决于模型和服务商。

Key 默认不持久保存；勾选“保存 Key”后存入 Tampermonkey。题目会发送到所选 API，调用可能收费。接口返回值和选中状态校验通过后才会提交。

拖放和正文点选依赖 IXL 组件接口，安装后须刷新页面。遇到站点更新或不支持的题型会停止。模型可能答错，请先验证；项目尚未完成所有题型的端到端测试。

## 开发

无需构建或运行时依赖。使用 Node.js 执行 `npm test`，检查语法及 API 请求格式、JSON 校验、思考参数和错误脱敏；测试不调用真实 API。

## 协议

[GNU GPL v3.0 或后续版本](LICENSE)。
