# UnlearnArc MCP Server

An [MCP](https://modelcontextprotocol.io) server that lets AI agents (Claude,
Cursor, Copilot, etc.) author content for the UnlearnArc learning platform —
**without ever touching the database directly**.

```
AI Agent
   │  MCP tool calls
   ▼
unlearnarc-mcp   (this server, Python)
   │  HTTP + Bearer JWT
   ▼
Java Spring Boot app  (port 8085)
   │  Spring Validation, @PreAuthorize, HtmlSanitizer
   ▼
MySQL database
```

## Why MCP instead of direct DB access?

| Direct DB | MCP → Java API |
|-----------|---------------|
| Bypasses Bean Validation | Every `@NotBlank`, `@Size`, `@Pattern` fires |
| Bypasses `@PreAuthorize` | Admin role enforced per request |
| Skips `HtmlSanitizer` | Rich-text notes are always sanitized |
| No duplicate detection | Service-layer guards run (duplicate course, etc.) |
| No audit trail | Spring logs every write |

---

## Setup

### 1. Create your `.env`

```bash
cp mcp/.env.example mcp/.env
# fill in ADMIN_EMAIL and ADMIN_PASSWORD (must match backend/.env)
```

### 2. Create the virtual environment

```bash
cd mcp
python3 -m venv .venv
.venv/bin/pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org \
    "mcp[cli]<2" httpx pydantic -e .
```

### 3. Start the Java backend first

```bash
cd backend && ./mvnw spring-boot:run
```

### 4. Test the server manually

```bash
cd mcp
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret \
  .venv/bin/python -m unlearnarc_mcp.server
```

---

## Claude Desktop integration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "unlearnarc": {
      "command": "/Users/subra-zstch1595/unlearnarc/mcp/.venv/bin/python",
      "args": ["-m", "unlearnarc_mcp.server"],
      "cwd": "/Users/subra-zstch1595/unlearnarc/mcp",
      "env": {
        "UNLEARNARC_API_URL": "http://localhost:8085",
        "ADMIN_EMAIL": "unlearnarc@gmail.com",
        "ADMIN_PASSWORD": "<your-admin-password>"
      }
    }
  }
}
```

> **Tip:** If you already have a `.env` file in `mcp/`, omit the `env` block and
> let `python-dotenv` pick it up automatically — `server.py` loads `.env`
> automatically via `python-dotenv` when present.

---

## Available tools (37)

| Category | Tools |
|----------|-------|
| **Domains** | `list_domains`, `create_domain`, `update_domain`, `delete_domain` |
| **Skills** | `list_skills`, `create_skill`, `update_skill`, `delete_skill` |
| **Courses** | `list_courses`, `create_course`, `update_course`, `delete_course` |
| **Topics** | `list_topics_for_course`, `create_topic`, `update_topic`, `delete_topic` |
| **Notes** | `list_notes_for_topic`, `create_note`, `update_note`, `publish_note`, `unpublish_note`, `delete_note` |
| **Mappings** | `map_skill_to_domain`, `list_domain_skill_mappings`, `map_course_to_skill`, `list_skill_course_mappings` |
| **Algorithms** | `list_algorithms`, `get_algorithm`, `create_algorithm`, `publish_algorithm` |
| **Animations** | `list_animation_scenes`, `create_animation_scene`, `publish_animation_scene` |
| **Roles** | `list_roles`, `create_role` |
| **Diagnostics** | `health_check`, `whoami` |

### Validation enforced by the Java layer

- `create_domain` — name must be unique and non-blank
- `create_skill` — `(name, level)` pair must be unique; level is an enum
- `create_course` — name unique, level enum, `imgUrl`/`totalTime`/`topicsCount` required
- `create_topic` — `(name, courseId)` unique; course must exist; level enum
- `create_note` — exactly one of `topicId`/`courseId`; parent must exist; content sanitized
- `create_algorithm` — slug regex, spec passes `AlgorithmSpecValidator`
- `create_animation_scene` — slug regex; AUTHORED needs trace, GENERATED needs kind

---

## Security model

- The MCP server authenticates **once** at startup and caches the JWT.
- On a `401` it re-authenticates automatically and retries once.
- The token is stored only in process memory, never on disk.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` are read from the environment — keep
  `.env` out of version control (it is in `.gitignore`).
- The Java app's rate-limiting and audit logging apply to every call.
