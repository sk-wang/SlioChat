# 项目 Skill

本项目的自动化构建推送 SOP。

## deploy

### 说明
构建项目、提交代码、推送到远程并部署到 Cloudflare Pages。

### 执行步骤

1. 运行 `npm run build` 构建项目
2. 检查 git status 查看变更文件
3. 使用 git add 暂存需要提交的文件
4. 创建符合 conventional commits 格式的 commit message
5. 执行 `git push origin main` 推送代码
6. 执行 `npx wrangler pages deploy dist --project-name=slio-chat --branch=main --commit-dirty=true` 部署到 Cloudflare Pages

### 预期结果
- 构建成功
- 代码已推送到远程仓库
- Cloudflare Pages 部署完成，返回部署 URL

## release

### 说明
查看上次 release 后的变更，创建 Git tag 并发布 GitHub Release。

### 执行步骤

1. 运行 `git log v<x.x.x>..HEAD --oneline` 查看上次 release 之后的提交
2. 根据提交历史整理变更内容
3. 运行 `git tag v<x.x.x` 创建 tag
4. 运行 `git push origin v<x.x.x>` 推送 tag
5. 运行 `gh release create v<x.x.x> --target main --title "v<x.x.x>" --notes "<release-notes>"` 创建 GitHub Release

### Release Notes 格式

```markdown
## 新功能
- ✨ 新功能1
- ✨ 新功能2

## Bug修复
- 🐛 修复xxx

## 其他
- 📱 UI优化
```

### 预期结果
- Git tag 已创建并推送到远程
- GitHub Release 已创建并显示变更内容
