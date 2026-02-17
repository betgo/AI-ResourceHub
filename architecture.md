# ResourceHub - 架构设计文档

## 项目概述

`ResourceHub` 是一个资源分享网站，支持用户上传和管理资源，支持访客检索、收藏、评论和下载，支持管理员进行内容审核。

---

## 技术栈

| 层级 | 技术选型 |
| --- | --- |
| Frontend | Next.js 14+ (App Router) + TypeScript + Tailwind CSS |
| Backend | Next.js Route Handlers + Server Actions |
| Database | PostgreSQL (Supabase 托管) |
| Auth | Supabase Auth |
| Storage | Supabase Storage（资源文件 + 封面图） |
| Search | PostgreSQL Full Text + 过滤索引 |
| Deployment | Vercel + Supabase |

---

## 1. 系统架构

```mermaid
graph TB
    subgraph Frontend["Frontend (Next.js)"]
        Pages["Pages / Routes"]
        UI["UI Components"]
    end

    subgraph Backend["Backend (Next.js API)"]
        API["Route Handlers"]
        Service["Domain Services"]
    end

    subgraph Data["Supabase"]
        Auth["Auth"]
        DB[("PostgreSQL")]
        Storage["Object Storage"]
    end

    Pages --> UI
    UI --> API
    API --> Service
    Service --> Auth
    Service --> DB
    Service --> Storage
```

---

## 2. 核心业务流程

### 2.1 资源发布流程

```mermaid
flowchart TD
    A[用户登录] --> B[填写资源信息]
    B --> C[上传资源文件和封面]
    C --> D[保存为 pending]
    D --> E{管理员审核}
    E -->|通过| F[published]
    E -->|拒绝| G[rejected + reason]
```

### 2.2 资源消费流程

```mermaid
flowchart TD
    A[访问首页/列表页] --> B[搜索 + 分类筛选]
    B --> C[进入资源详情]
    C --> D[收藏]
    C --> E[评论]
    C --> F[下载]
    F --> G[记录下载历史]
```

---

## 3. 数据模型

```mermaid
erDiagram
    users ||--o{ resources : creates
    resources ||--o{ resource_tags : has
    tags ||--o{ resource_tags : maps
    categories ||--o{ resources : classifies
    users ||--o{ favorites : likes
    users ||--o{ comments : writes
    resources ||--o{ comments : has
    users ||--o{ downloads : triggers
    resources ||--o{ downloads : tracked

    users {
        uuid id PK
        string email
        datetime created_at
    }

    categories {
        uuid id PK
        string name
        string slug
    }

    tags {
        uuid id PK
        string name
        string slug
    }

    resources {
        uuid id PK
        uuid owner_id FK
        uuid category_id FK
        string title
        text description
        string file_url
        string cover_url
        string status "pending/published/rejected"
        int download_count
        int favorite_count
        datetime created_at
        datetime updated_at
    }

    resource_tags {
        uuid resource_id FK
        uuid tag_id FK
    }

    comments {
        uuid id PK
        uuid resource_id FK
        uuid user_id FK
        text content
        datetime created_at
    }

    favorites {
        uuid user_id FK
        uuid resource_id FK
        datetime created_at
    }

    downloads {
        uuid id PK
        uuid user_id FK
        uuid resource_id FK
        string ip_hash
        datetime created_at
    }
```

### 状态定义

| 字段 | 可选值 | 说明 |
| --- | --- | --- |
| `resource.status` | `pending` | 待审核 |
|  | `published` | 已上架 |
|  | `rejected` | 审核拒绝 |

---

## 4. 页面结构

```mermaid
graph TB
    Home["/"]
    Resources["/resources"]
    Detail["/resources/:id"]
    Submit["/submit"]
    Dashboard["/dashboard"]
    Admin["/admin/review"]
    Login["/login"]

    Home --> Resources
    Resources --> Detail
    Home --> Submit
    Home --> Dashboard
    Dashboard --> Detail
    Admin --> Detail
    Login --> Dashboard
```

页面说明：
- 首页：推荐资源、热门分类、最新上传
- 资源列表：搜索、分类过滤、标签过滤、排序、分页
- 资源详情：资源信息、评论区、收藏/下载入口
- 发布页：上传资源、填写 metadata、提交审核
- 个人中心：我的资源、我的收藏、下载记录
- 管理后台：待审核列表、通过/拒绝操作

---

## 5. API 设计（草案）

| 方法 | 路径 | 描述 |
| --- | --- | --- |
| `GET` | `/api/resources` | 资源列表（搜索/筛选/分页） |
| `POST` | `/api/resources` | 新建资源（默认 pending） |
| `GET` | `/api/resources/:id` | 获取资源详情 |
| `PATCH` | `/api/resources/:id` | 更新资源（仅 owner） |
| `DELETE` | `/api/resources/:id` | 删除资源（仅 owner/admin） |
| `POST` | `/api/resources/:id/favorite` | 收藏/取消收藏 |
| `POST` | `/api/resources/:id/download` | 下载并记录历史 |
| `POST` | `/api/resources/:id/comments` | 创建评论 |
| `GET` | `/api/resources/:id/comments` | 获取评论列表 |
| `GET` | `/api/categories` | 获取分类 |
| `GET` | `/api/tags` | 获取标签 |
| `POST` | `/api/upload` | 上传文件到 Storage |
| `POST` | `/api/admin/resources/:id/review` | 审核通过/拒绝 |

---

## 6. 非功能设计

- 性能：
  - 资源列表走分页 + 索引
  - 详情页静态化（ISR）+ 关键数据动态获取
- 安全：
  - 上传文件类型和大小校验
  - 服务端鉴权与 owner/admin 权限校验
  - 评论内容基础风控（长度、敏感词）
- 可维护性：
  - Domain service 分层
  - 统一 API error schema
  - `task.json` 驱动的渐进交付

---

## 7. 里程碑建议

1. M1：基础框架 + Auth + 数据模型
2. M2：资源 CRUD + 上传 + 列表/详情
3. M3：收藏/评论/下载 + Dashboard
4. M4：审核后台 + 稳定性与性能优化
