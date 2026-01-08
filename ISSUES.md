# 问题追踪文档

## 📋 说明

本文档用于临时记录开发过程中遇到的问题和解决方案。

**注意**: 对于 N8N 和 Supabase 的常见问题，请查看 `podcast-system/N8N_SUPABASE_COMMON_ISSUES.md`

---

## 🔧 已解决的问题

### 1. N8N Code 节点数据访问

**问题**: 访问前一个节点的数据时出错

**错误写法**:
```javascript
const previousData = $('节点名称').item.json;
```

**正确写法**:
```javascript
const previousData = $('节点名称').first().json;
```

**解决时间**: 2025-01-07

---

## 🚧 待解决的问题

（暂无）

---

## 📝 问题报告模板

当遇到新问题时，请按以下格式添加：

```markdown
### X. 问题标题

**问题描述**: 
详细描述问题现象

**错误信息**:
```
粘贴错误日志
```

**环境信息**:
- 系统: Supabase / N8N / Edge Function
- 时间: YYYY-MM-DD

**解决方案**:
（待解决 / 已解决的方案）

**解决时间**: YYYY-MM-DD
```

---

**文档版本**: 1.0  
**创建日期**: 2025-01-08  
**维护者**: 开发团队