"""
UnlearnArc MCP Server
=====================
Exposes admin content-authoring tools to AI agents.

Every tool goes through the Java application's REST API, which means:
  - Bean Validation (@NotBlank, @Size, @Pattern …) fires automatically.
  - @PreAuthorize("hasRole('ADMIN')") guards are enforced.
  - Service-layer duplicate checks run (e.g. "domain already exists").
  - HtmlSanitizer strips dangerous markup from rich-text content.
  - The agent NEVER touches the database directly.

Environment variables required:
  UNLEARNARC_API_URL   – Java backend base URL (default: http://localhost:8085)
  ADMIN_EMAIL          – admin account email
  ADMIN_PASSWORD       – admin account password
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, List, Optional

# Load .env from the mcp/ directory if present (dev convenience).
# In production the caller injects env vars directly.
try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).parent.parent.parent / ".env"
    if _env_path.exists():
        load_dotenv(_env_path)
except ImportError:
    pass  # python-dotenv is optional

from mcp.server.fastmcp import FastMCP

from .auth import TokenManager
from .client import ApiClient

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ── Init ───────────────────────────────────────────────────────────────────────
BASE_URL = os.environ.get("UNLEARNARC_API_URL", "http://localhost:8085")
_tm = TokenManager(BASE_URL)
_api = ApiClient(BASE_URL, _tm)

mcp = FastMCP(
    "UnlearnArc Admin",
    instructions=(
        "You are an admin content assistant for the UnlearnArc learning platform. "
        "Use these tools to create and manage learning content. "
        "Every call goes through the Java application and its full validation stack — "
        "you cannot bypass database constraints, duplication checks, or security rules."
    ),
)


# ══════════════════════════════════════════════════════════════════════════════
# Helper
# ══════════════════════════════════════════════════════════════════════════════

def _fmt(data: Any) -> str:
    """Format a response for the agent as compact JSON."""
    return json.dumps(data, indent=2, default=str)


# ══════════════════════════════════════════════════════════════════════════════
# ── DOMAINS ──────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def list_domains() -> str:
    """List all learning domains."""
    return _fmt(_api.get("/api/v1/domains"))


@mcp.tool()
def create_domain(name: str) -> str:
    """
    Create a new learning domain.

    The Java API enforces:
      - name must not be blank
      - name must be unique (duplicate → 400 Bad Request)

    Args:
        name: Display name of the domain (e.g. "Data Structures")
    """
    return _fmt(_api.post("/api/v1/domains", {"name": name}))


@mcp.tool()
def update_domain(domain_id: str, name: str) -> str:
    """
    Update an existing domain's name.

    Args:
        domain_id: UUID of the domain
        name:      New display name
    """
    return _fmt(_api.put(f"/api/v1/domains/{domain_id}", {"name": name}))


@mcp.tool()
def delete_domain(domain_id: str) -> str:
    """
    Delete a domain by ID.

    Args:
        domain_id: UUID of the domain to delete
    """
    _api.delete(f"/api/v1/domains/{domain_id}")
    return f"Domain {domain_id} deleted."


# ══════════════════════════════════════════════════════════════════════════════
# ── SKILLS ───────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def list_skills() -> str:
    """List all skills."""
    return _fmt(_api.get("/api/v1/skills"))


@mcp.tool()
def create_skill(name: str, level: str) -> str:
    """
    Create a new skill.

    The Java API enforces:
      - name must not be blank
      - level must be one of: BEGINNER, INTERMEDIATE, ADVANCED
      - (name, level) pair must be unique

    Args:
        name:  Skill name (e.g. "Binary Search")
        level: Difficulty level — BEGINNER | INTERMEDIATE | ADVANCED
    """
    return _fmt(_api.post("/api/v1/skills", {"name": name, "level": level}))


@mcp.tool()
def update_skill(skill_id: str, name: str, level: str) -> str:
    """
    Update an existing skill.

    Args:
        skill_id: UUID of the skill
        name:     New skill name
        level:    New difficulty level — BEGINNER | INTERMEDIATE | ADVANCED
    """
    return _fmt(_api.put(f"/api/v1/skills/{skill_id}", {"name": name, "level": level}))


@mcp.tool()
def delete_skill(skill_id: str) -> str:
    """
    Delete a skill by ID.

    Args:
        skill_id: UUID of the skill to delete
    """
    _api.delete(f"/api/v1/skills/{skill_id}")
    return f"Skill {skill_id} deleted."


# ══════════════════════════════════════════════════════════════════════════════
# ── COURSES ───────────────────────────────────────────────────────────════════
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def list_courses() -> str:
    """List all courses."""
    return _fmt(_api.get("/api/v1/courses"))


@mcp.tool()
def create_course(
    name: str,
    img_url: str,
    total_time: str,
    topics_count: int,
    level: str,
    qus_pool: Optional[str] = None,
) -> str:
    """
    Create a new course.

    The Java API enforces:
      - name, imgUrl, totalTime, topicsCount, level must not be blank/null
      - level must be one of: BEGINNER, INTERMEDIATE, ADVANCED
      - name must be unique

    Args:
        name:         Course title (e.g. "Searching Algorithms")
        img_url:      Thumbnail URL
        total_time:   HH:MM:SS duration (e.g. "02:30:00")
        topics_count: Estimated number of topics
        level:        BEGINNER | INTERMEDIATE | ADVANCED
        qus_pool:     Optional question pool UUID to attach
    """
    body: dict = {
        "name": name,
        "imgUrl": img_url,
        "totalTime": total_time,
        "topicsCount": topics_count,
        "level": level,
    }
    if qus_pool:
        body["qusPool"] = qus_pool
    return _fmt(_api.post("/api/v1/courses", body))


@mcp.tool()
def update_course(
    course_id: str,
    name: str,
    img_url: str,
    total_time: str,
    topics_count: int,
    level: str,
    qus_pool: Optional[str] = None,
) -> str:
    """
    Update a course.

    Args:
        course_id:    UUID of the course
        name:         New course title
        img_url:      New thumbnail URL
        total_time:   HH:MM:SS (e.g. "03:00:00")
        topics_count: Estimated number of topics
        level:        BEGINNER | INTERMEDIATE | ADVANCED
        qus_pool:     Optional question pool UUID
    """
    body: dict = {
        "name": name,
        "imgUrl": img_url,
        "totalTime": total_time,
        "topicsCount": topics_count,
        "level": level,
    }
    if qus_pool:
        body["qusPool"] = qus_pool
    return _fmt(_api.put(f"/api/v1/courses/{course_id}", body))


@mcp.tool()
def delete_course(course_id: str) -> str:
    """
    Delete a course by ID.

    Args:
        course_id: UUID of the course to delete
    """
    _api.delete(f"/api/v1/courses/{course_id}")
    return f"Course {course_id} deleted."


# ══════════════════════════════════════════════════════════════════════════════
# ── TOPICS ───────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def list_topics_for_course(course_id: str) -> str:
    """
    List all topics for a course.

    Args:
        course_id: UUID of the parent course
    """
    return _fmt(_api.get(f"/api/v1/topics/course/{course_id}"))


@mcp.tool()
def create_topic(
    name: str,
    course_id: str,
    topic_order: int,
    time: str,
    level: str,
) -> str:
    """
    Create a new topic inside a course.

    The Java API enforces:
      - name, time, topicOrder, level, courseId must not be null/blank
      - level must be one of: BEGINNER, INTERMEDIATE, ADVANCED
      - courseId must reference an existing course
      - (name, courseId) pair must be unique within the course

    Args:
        name:        Topic title (e.g. "Linear Search")
        course_id:   UUID of the parent course
        topic_order: Integer sort position (1-based)
        time:        HH:MM:SS estimated reading time (e.g. "00:20:00")
        level:       BEGINNER | INTERMEDIATE | ADVANCED
    """
    return _fmt(_api.post("/api/v1/topics", {
        "name": name,
        "courseId": course_id,
        "topicOrder": topic_order,
        "time": time,
        "level": level,
    }))


@mcp.tool()
def update_topic(
    topic_id: str,
    name: str,
    course_id: str,
    topic_order: int,
    time: str,
    level: str,
) -> str:
    """
    Update a topic.

    Args:
        topic_id:    UUID of the topic
        name:        New topic title
        course_id:   UUID of the parent course
        topic_order: Integer sort position
        time:        HH:MM:SS estimated reading time
        level:       BEGINNER | INTERMEDIATE | ADVANCED
    """
    return _fmt(_api.put(f"/api/v1/topics/{topic_id}", {
        "name": name,
        "courseId": course_id,
        "topicOrder": topic_order,
        "time": time,
        "level": level,
    }))


@mcp.tool()
def delete_topic(topic_id: str) -> str:
    """
    Delete a topic by ID.

    Args:
        topic_id: UUID of the topic to delete
    """
    _api.delete(f"/api/v1/topics/{topic_id}")
    return f"Topic {topic_id} deleted."


# ══════════════════════════════════════════════════════════════════════════════
# ── NOTES (rich-text lessons) ─────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def list_notes_for_topic(topic_id: str) -> str:
    """
    List all notes (lessons) for a topic — admin view (includes drafts).

    Args:
        topic_id: UUID of the topic
    """
    return _fmt(_api.get(f"/api/v1/notes/admin/topic/{topic_id}"))


@mcp.tool()
def create_note(
    title: str,
    content_html: str,
    topic_id: Optional[str] = None,
    course_id: Optional[str] = None,
    summary: Optional[str] = None,
    note_order: int = 0,
    read_minutes: int = 5,
    is_published: bool = False,
) -> str:
    """
    Create a new rich-text lesson note.

    The Java API enforces:
      - title must not be blank (max 255 chars)
      - contentHtml must not be blank (max 200 000 chars)
      - Exactly one of topicId or courseId must be provided
      - The parent (topic/course) must exist
      - contentHtml is sanitized server-side (HtmlSanitizer) before storage

    Args:
        title:        Note title
        content_html: HTML lesson content — will be sanitized server-side
        topic_id:     UUID of the parent topic  (provide one of topic_id / course_id)
        course_id:    UUID of the parent course (provide one of topic_id / course_id)
        summary:      Short summary (max 500 chars)
        note_order:   Sort position (0-based, default 0)
        read_minutes: Estimated reading time in minutes (default 5)
        is_published: Publish immediately? (default False — save as draft)
    """
    body: dict = {
        "title": title,
        "contentHtml": content_html,
        "noteOrder": note_order,
        "readMinutes": read_minutes,
        "isPublished": is_published,
    }
    if topic_id:
        body["topicId"] = topic_id
    if course_id:
        body["courseId"] = course_id
    if summary:
        body["summary"] = summary
    return _fmt(_api.post("/api/v1/notes", body))


@mcp.tool()
def update_note(
    note_id: str,
    title: str,
    content_html: str,
    topic_id: Optional[str] = None,
    course_id: Optional[str] = None,
    summary: Optional[str] = None,
    note_order: int = 0,
    read_minutes: int = 5,
    is_published: bool = False,
) -> str:
    """
    Update an existing note's content.

    Content is re-sanitized on every update — the same server-side rules apply.

    Args:
        note_id:      UUID of the note to update
        title:        Updated title
        content_html: Updated HTML content (will be sanitized)
        topic_id:     UUID of the parent topic
        course_id:    UUID of the parent course
        summary:      Short summary
        note_order:   Sort order
        read_minutes: Estimated reading time
        is_published: Publish state
    """
    body: dict = {
        "title": title,
        "contentHtml": content_html,
        "noteOrder": note_order,
        "readMinutes": read_minutes,
        "isPublished": is_published,
    }
    if topic_id:
        body["topicId"] = topic_id
    if course_id:
        body["courseId"] = course_id
    if summary:
        body["summary"] = summary
    return _fmt(_api.put(f"/api/v1/notes/{note_id}", body))


@mcp.tool()
def publish_note(note_id: str) -> str:
    """
    Publish a draft note so students can see it.

    Args:
        note_id: UUID of the note
    """
    return _fmt(_api.put(f"/api/v1/notes/{note_id}/published", {"published": True}))


@mcp.tool()
def unpublish_note(note_id: str) -> str:
    """
    Retract a published note back to draft.

    Args:
        note_id: UUID of the note
    """
    return _fmt(_api.put(f"/api/v1/notes/{note_id}/published", {"published": False}))


@mcp.tool()
def delete_note(note_id: str) -> str:
    """
    Delete a note permanently.

    Args:
        note_id: UUID of the note to delete
    """
    _api.delete(f"/api/v1/notes/{note_id}")
    return f"Note {note_id} deleted."


# ══════════════════════════════════════════════════════════════════════════════
# ── DOMAIN-SKILL MAPPINGS ────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def map_skill_to_domain(domain_id: str, skill_id: str) -> str:
    """
    Associate a skill with a domain.

    Args:
        domain_id: UUID of the domain
        skill_id:  UUID of the skill
    """
    return _fmt(_api.post("/api/v1/domain-skill-mappings", {
        "domainId": domain_id,
        "skillId": skill_id,
    }))


@mcp.tool()
def list_domain_skill_mappings() -> str:
    """List all domain-to-skill mappings."""
    return _fmt(_api.get("/api/v1/domain-skill-mappings"))


# ══════════════════════════════════════════════════════════════════════════════
# ── SKILL-COURSE MAPPINGS ────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def map_course_to_skill(skill_id: str, course_id: str) -> str:
    """
    Associate a course with a skill.

    Args:
        skill_id:  UUID of the skill
        course_id: UUID of the course
    """
    return _fmt(_api.post("/api/v1/skill-course-mappings", {
        "skillId": skill_id,
        "courseId": course_id,
    }))


@mcp.tool()
def list_skill_course_mappings() -> str:
    """List all skill-to-course mappings."""
    return _fmt(_api.get("/api/v1/skill-course-mappings"))


# ══════════════════════════════════════════════════════════════════════════════
# ── QUESTION POOLS ───────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def list_question_pools() -> str:
    """List all question pools (admin view)."""
    return _fmt(_api.get("/api/v1/question-pools"))


@mcp.tool()
def list_question_pools_by_scope(scope_type: str) -> str:
    """
    List question pools filtered by scope.

    Args:
        scope_type: DOMAIN | COURSE | TOPIC
    """
    return _fmt(_api.get(f"/api/v1/question-pools/scope/{scope_type}"))


@mcp.tool()
def get_question_pool(pool_id: str) -> str:
    """
    Fetch a single question pool by ID.

    Args:
        pool_id: UUID of the pool
    """
    return _fmt(_api.get(f"/api/v1/question-pools/{pool_id}"))


@mcp.tool()
def list_question_pools_by_domain(domain_id: str) -> str:
    """
    List all question pools mapped to a domain.

    Args:
        domain_id: UUID of the domain
    """
    return _fmt(_api.get(f"/api/v1/question-pools/by-domain/{domain_id}"))


@mcp.tool()
def list_question_pools_by_course(course_id: str) -> str:
    """
    List all question pools mapped to a course.

    Args:
        course_id: UUID of the course
    """
    return _fmt(_api.get(f"/api/v1/question-pools/by-course/{course_id}"))


@mcp.tool()
def list_question_pools_by_topic(topic_id: str) -> str:
    """
    List all question pools mapped to a topic.

    Args:
        topic_id: UUID of the topic
    """
    return _fmt(_api.get(f"/api/v1/question-pools/by-topic/{topic_id}"))


@mcp.tool()
def create_question_pool(
    name: str,
    scope_type: str,
    description: Optional[str] = None,
    total_questions: int = 9,
    easy_count: int = 3,
    medium_count: int = 3,
    hard_count: int = 3,
    pass_percentage: int = 60,
    time_limit_minutes: int = 0,
) -> str:
    """
    Create a new question pool.

    The Java API enforces:
      - name must not be blank
      - scopeType must be DOMAIN | COURSE | TOPIC
      - totalQuestions must be between 1 and 100
      - easyCount + mediumCount + hardCount should equal totalQuestions
      - passPercentage must be 0–100

    After creating the pool, call map_question_pool_to_entity() to link it
    to the appropriate domain / course / topic.

    Args:
        name:               Pool name (e.g. "Sorting Algorithms Quiz")
        scope_type:         DOMAIN | COURSE | TOPIC
        description:        Optional description
        total_questions:    Total questions drawn per test session (default 9)
        easy_count:         How many EASY questions to include (default 3)
        medium_count:       How many MEDIUM questions to include (default 3)
        hard_count:         How many HARD questions to include (default 3)
        pass_percentage:    Pass threshold 0-100 (default 60)
        time_limit_minutes: Minutes per session, 0 = unlimited (default 0)
    """
    body: dict = {
        "name": name,
        "scopeType": scope_type,
        "totalQuestions": total_questions,
        "easyCount": easy_count,
        "mediumCount": medium_count,
        "hardCount": hard_count,
        "passPercentage": pass_percentage,
        "timeLimitMinutes": time_limit_minutes,
    }
    if description:
        body["description"] = description
    return _fmt(_api.post("/api/v1/question-pools", body))


@mcp.tool()
def update_question_pool(
    pool_id: str,
    name: str,
    scope_type: str,
    description: Optional[str] = None,
    total_questions: int = 9,
    easy_count: int = 3,
    medium_count: int = 3,
    hard_count: int = 3,
    pass_percentage: int = 60,
    time_limit_minutes: int = 0,
) -> str:
    """
    Update an existing question pool.

    Args:
        pool_id:            UUID of the pool
        name:               Updated pool name
        scope_type:         DOMAIN | COURSE | TOPIC
        description:        Optional description
        total_questions:    Total questions drawn per session
        easy_count:         Easy question count
        medium_count:       Medium question count
        hard_count:         Hard question count
        pass_percentage:    Pass threshold 0-100
        time_limit_minutes: Minutes per session, 0 = unlimited
    """
    body: dict = {
        "name": name,
        "scopeType": scope_type,
        "totalQuestions": total_questions,
        "easyCount": easy_count,
        "mediumCount": medium_count,
        "hardCount": hard_count,
        "passPercentage": pass_percentage,
        "timeLimitMinutes": time_limit_minutes,
    }
    if description:
        body["description"] = description
    return _fmt(_api.put(f"/api/v1/question-pools/{pool_id}", body))


@mcp.tool()
def toggle_question_pool_active(pool_id: str) -> str:
    """
    Toggle the active state of a question pool (active ↔ inactive).

    Args:
        pool_id: UUID of the pool
    """
    _api._request("PATCH", f"/api/v1/question-pools/{pool_id}/toggle-active")
    return f"Question pool {pool_id} active state toggled."


@mcp.tool()
def delete_question_pool(pool_id: str) -> str:
    """
    Delete a question pool permanently.

    Args:
        pool_id: UUID of the pool to delete
    """
    _api.delete(f"/api/v1/question-pools/{pool_id}")
    return f"Question pool {pool_id} deleted."


@mcp.tool()
def map_question_pool_to_entity(
    pool_id: str,
    domain_id: Optional[str] = None,
    course_id: Optional[str] = None,
    topic_id: Optional[str] = None,
) -> str:
    """
    Link a question pool to a domain, course, or topic.

    Provide exactly ONE of domain_id / course_id / topic_id — this must match
    the scopeType the pool was created with.

    The Java API enforces:
      - poolId is required
      - Exactly one scope entity ID must be provided
      - The pool's scopeType must match the entity type supplied

    Args:
        pool_id:   UUID of the question pool
        domain_id: UUID of the domain  (use when scopeType=DOMAIN)
        course_id: UUID of the course  (use when scopeType=COURSE)
        topic_id:  UUID of the topic   (use when scopeType=TOPIC)
    """
    body: dict = {"poolId": pool_id}
    if domain_id:
        body["domainId"] = domain_id
    if course_id:
        body["courseId"] = course_id
    if topic_id:
        body["topicId"] = topic_id
    return _fmt(_api.post("/api/v1/question-pools/map", body))


# ══════════════════════════════════════════════════════════════════════════════
# ── QUESTIONS ────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def list_questions_for_pool(pool_id: str) -> str:
    """
    List all questions in a question pool.

    Args:
        pool_id: UUID of the question pool
    """
    return _fmt(_api.get(f"/api/v1/questions/pool/{pool_id}"))


@mcp.tool()
def list_questions_by_pool_and_difficulty(pool_id: str, difficulty: str) -> str:
    """
    List questions in a pool filtered by difficulty.

    Args:
        pool_id:    UUID of the question pool
        difficulty: EASY | MEDIUM | HARD
    """
    return _fmt(_api.get(f"/api/v1/questions/pool/{pool_id}/difficulty/{difficulty}"))


@mcp.tool()
def get_question(question_id: str) -> str:
    """
    Fetch a single question by ID.

    Args:
        question_id: UUID of the question
    """
    return _fmt(_api.get(f"/api/v1/questions/{question_id}"))


@mcp.tool()
def create_question(
    pool_id: str,
    question_text: str,
    question_type: str,
    difficulty: str,
    answers: list,
    points: int = 1,
    explanation: Optional[str] = None,
) -> str:
    """
    Create a new MCQ or multiple-correct question in a pool.

    The Java API enforces:
      - poolId, questionText, questionType, difficulty are required
      - questionType must be MCQ or MULTIPLE_CORRECT
      - difficulty must be EASY | MEDIUM | HARD
      - points must be 1–100
      - answers list: 2–10 entries; each needs answerText and isCorrect
      - MCQ: exactly ONE answer must have isCorrect=true
      - MULTIPLE_CORRECT: at least TWO answers must have isCorrect=true

    Args:
        pool_id:       UUID of the question pool
        question_text: The question text (HTML or plain text)
        question_type: MCQ | MULTIPLE_CORRECT
        difficulty:    EASY | MEDIUM | HARD
        answers:       List of answer objects, each with:
                         { "answerText": str, "isCorrect": bool, "displayOrder": int }
        points:        Points awarded for correct answer (1–100, default 1)
        explanation:   Optional explanation shown after answering

    Example answers list for MCQ:
        [
          {"answerText": "O(n log n)", "isCorrect": true,  "displayOrder": 0},
          {"answerText": "O(n²)",      "isCorrect": false, "displayOrder": 1},
          {"answerText": "O(n)",       "isCorrect": false, "displayOrder": 2},
          {"answerText": "O(log n)",   "isCorrect": false, "displayOrder": 3}
        ]
    """
    body: dict = {
        "poolId": pool_id,
        "questionText": question_text,
        "questionType": question_type,
        "difficulty": difficulty,
        "points": points,
        "answers": answers,
    }
    if explanation:
        body["explanation"] = explanation
    return _fmt(_api.post("/api/v1/questions", body))


@mcp.tool()
def bulk_create_questions(questions: list) -> str:
    """
    Create multiple questions in one call — each item follows the same schema
    as create_question.

    Useful for seeding an entire topic's quiz bank in a single tool call.
    The Java API validates each question individually; if any fail, the whole
    batch is rejected (transactional).

    Args:
        questions: List of question objects, each with:
                     poolId, questionText, questionType, difficulty,
                     answers (list), points (optional), explanation (optional)

    Example:
        [
          {
            "poolId": "...",
            "questionText": "What is the time complexity of Merge Sort?",
            "questionType": "MCQ",
            "difficulty": "MEDIUM",
            "points": 2,
            "answers": [
              {"answerText": "O(n log n)", "isCorrect": true,  "displayOrder": 0},
              {"answerText": "O(n²)",      "isCorrect": false, "displayOrder": 1}
            ]
          }
        ]
    """
    return _fmt(_api.post("/api/v1/questions/bulk", questions))


@mcp.tool()
def update_question(
    question_id: str,
    pool_id: str,
    question_text: str,
    question_type: str,
    difficulty: str,
    answers: list,
    points: int = 1,
    explanation: Optional[str] = None,
) -> str:
    """
    Update an existing question (replaces the question and all its answers).

    The same validation rules as create_question apply.

    Args:
        question_id:   UUID of the question to update
        pool_id:       UUID of the question pool
        question_text: Updated question text
        question_type: MCQ | MULTIPLE_CORRECT
        difficulty:    EASY | MEDIUM | HARD
        answers:       Full replacement answer list
        points:        Points (1–100)
        explanation:   Optional explanation
    """
    body: dict = {
        "poolId": pool_id,
        "questionText": question_text,
        "questionType": question_type,
        "difficulty": difficulty,
        "points": points,
        "answers": answers,
    }
    if explanation:
        body["explanation"] = explanation
    return _fmt(_api.put(f"/api/v1/questions/{question_id}", body))


@mcp.tool()
def toggle_question_active(question_id: str) -> str:
    """
    Toggle a question's active state (active ↔ inactive).
    Inactive questions are excluded from test sessions.

    Args:
        question_id: UUID of the question
    """
    _api._request("PATCH", f"/api/v1/questions/{question_id}/toggle-active")
    return f"Question {question_id} active state toggled."


@mcp.tool()
def delete_question(question_id: str) -> str:
    """
    Delete a question permanently.

    Args:
        question_id: UUID of the question to delete
    """
    _api.delete(f"/api/v1/questions/{question_id}")
    return f"Question {question_id} deleted."


# ══════════════════════════════════════════════════════════════════════════════
# ── CONTESTS ─────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def list_contests() -> str:
    """List all contests — admin view (includes DRAFT and ARCHIVED)."""
    return _fmt(_api.get("/api/v1/admin/contests"))


@mcp.tool()
def create_contest(
    title: str,
    description: Optional[str] = None,
    slug: Optional[str] = None,
    visibility: str = "PUBLIC",
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    duration_minutes: int = 0,
    allowed_languages: str = "python,java,cpp,javascript",
    wrong_submission_penalty: int = 0,
) -> str:
    """
    Create a new coding contest (starts in DRAFT status).

    The Java API enforces:
      - title must not be blank (max 255 chars)
      - slug must be unique — auto-generated from title when blank
      - visibility must be PUBLIC | PRIVATE
      - If endTime is set, startTime must be before endTime

    After creating, add problems with add_contest_problem(), then publish
    with set_contest_status(id, "PUBLISHED").

    Args:
        title:                    Contest title
        description:              Markdown description shown to participants
        slug:                     URL slug — auto-generated if omitted
        visibility:               PUBLIC | PRIVATE (default PUBLIC)
        start_time:               ISO-8601 UTC datetime (e.g. "2025-08-01T10:00:00Z")
        end_time:                 ISO-8601 UTC datetime
        duration_minutes:         Per-participant time budget (0 = until endTime)
        allowed_languages:        CSV of languages (default "python,java,cpp,javascript")
        wrong_submission_penalty: Penalty points per wrong submission (ICPC style, default 0)
    """
    body: dict = {
        "title": title,
        "visibility": visibility,
        "durationMinutes": duration_minutes,
        "allowedLanguages": allowed_languages,
        "wrongSubmissionPenalty": wrong_submission_penalty,
    }
    if slug:
        body["slug"] = slug
    if description:
        body["description"] = description
    if start_time:
        body["startTime"] = start_time
    if end_time:
        body["endTime"] = end_time
    return _fmt(_api.post("/api/v1/admin/contests", body))


@mcp.tool()
def update_contest(
    contest_id: str,
    title: str,
    description: Optional[str] = None,
    slug: Optional[str] = None,
    visibility: str = "PUBLIC",
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    duration_minutes: int = 0,
    allowed_languages: str = "python,java,cpp,javascript",
    wrong_submission_penalty: int = 0,
) -> str:
    """
    Update a contest's metadata. Problems are managed separately via the
    add / update / delete problem tools.

    Args:
        contest_id:               UUID of the contest
        title:                    Updated title
        description:              Updated Markdown description
        slug:                     Updated slug
        visibility:               PUBLIC | PRIVATE
        start_time:               ISO-8601 UTC datetime
        end_time:                 ISO-8601 UTC datetime
        duration_minutes:         Per-participant time budget (0 = none)
        allowed_languages:        CSV of allowed languages
        wrong_submission_penalty: Penalty per wrong submission
    """
    body: dict = {
        "title": title,
        "visibility": visibility,
        "durationMinutes": duration_minutes,
        "allowedLanguages": allowed_languages,
        "wrongSubmissionPenalty": wrong_submission_penalty,
    }
    if slug:
        body["slug"] = slug
    if description:
        body["description"] = description
    if start_time:
        body["startTime"] = start_time
    if end_time:
        body["endTime"] = end_time
    return _fmt(_api.put(f"/api/v1/admin/contests/{contest_id}", body))


@mcp.tool()
def set_contest_status(contest_id: str, status: str) -> str:
    """
    Change the lifecycle status of a contest.

    Lifecycle: DRAFT → PUBLISHED → ARCHIVED
      - PUBLISHED: visible to students; submissions accepted in the time window
      - ARCHIVED:  read-only; leaderboard frozen

    Args:
        contest_id: UUID of the contest
        status:     DRAFT | PUBLISHED | ARCHIVED
    """
    return _fmt(_api._request("PATCH", f"/api/v1/admin/contests/{contest_id}/status/{status}"))


@mcp.tool()
def delete_contest(contest_id: str) -> str:
    """
    Delete a contest and all its problems permanently.

    Args:
        contest_id: UUID of the contest to delete
    """
    _api.delete(f"/api/v1/admin/contests/{contest_id}")
    return f"Contest {contest_id} deleted."


# ── Contest Problems ──────────────────────────────────────────────────────────

@mcp.tool()
def list_contest_problems(contest_id: str) -> str:
    """
    List all problems in a contest — admin view (includes test cases).

    Args:
        contest_id: UUID of the contest
    """
    return _fmt(_api.get(f"/api/v1/admin/contests/{contest_id}/problems"))


@mcp.tool()
def add_contest_problem(
    contest_id: str,
    title: str,
    statement: str,
    difficulty: str,
    test_cases: list,
    constraints: Optional[str] = None,
    max_points: int = 100,
    starter_code_json: Optional[str] = None,
    harness_type: str = "STDIN_STDOUT",
    time_limit_ms: int = 2000,
    display_order: int = 0,
) -> str:
    """
    Add a coding problem to a contest.

    The Java API enforces:
      - title and statement must not be blank
      - difficulty must be EASY | MEDIUM | HARD
      - test_cases: each must have input and expectedOutput (required)
      - harnessType must be STDIN_STDOUT | FUNCTION_RETURN

    Test case anatomy:
      PUBLIC cases (isHidden=false) → shown to students as sample I/O
      HIDDEN cases (isHidden=true)  → server-side only for authoritative scoring

    Args:
        contest_id:         UUID of the parent contest
        title:              Problem title (e.g. "Two Sum")
        statement:          Markdown problem statement
        difficulty:         EASY | MEDIUM | HARD
        test_cases:         List of test case objects:
                              { "input": str, "expectedOutput": str,
                                "isHidden": bool, "weight": int,
                                "strictMatch": bool, "displayOrder": int }
        constraints:        Markdown constraints / input format description
        max_points:         Max points for this problem (default 100)
        starter_code_json:  JSON string keyed by language, e.g.:
                              '{"python":"def solve():\\n    pass","java":"class Solution{}"}'
        harness_type:       STDIN_STDOUT | FUNCTION_RETURN (default STDIN_STDOUT)
        time_limit_ms:      Per-test wall-clock limit in ms (default 2000)
        display_order:      Sort position within the contest (default 0)

    Example test_cases:
        [
          {"input": "2\\n1 2\\n3", "expectedOutput": "0 1", "isHidden": false, "displayOrder": 0},
          {"input": "3\\n2 7 11\\n9", "expectedOutput": "0 1", "isHidden": true, "displayOrder": 1}
        ]
    """
    body: dict = {
        "title": title,
        "statement": statement,
        "difficulty": difficulty,
        "maxPoints": max_points,
        "harnessType": harness_type,
        "timeLimitMs": time_limit_ms,
        "displayOrder": display_order,
        "testCases": test_cases,
    }
    if constraints:
        body["constraints"] = constraints
    if starter_code_json:
        body["starterCodeJson"] = starter_code_json
    return _fmt(_api.post(f"/api/v1/admin/contests/{contest_id}/problems", body))


@mcp.tool()
def update_contest_problem(
    problem_id: str,
    title: str,
    statement: str,
    difficulty: str,
    test_cases: list,
    constraints: Optional[str] = None,
    max_points: int = 100,
    starter_code_json: Optional[str] = None,
    harness_type: str = "STDIN_STDOUT",
    time_limit_ms: int = 2000,
    display_order: int = 0,
) -> str:
    """
    Update an existing contest problem (replaces test cases).

    Args:
        problem_id:         UUID of the problem to update
        title:              Updated problem title
        statement:          Updated Markdown statement
        difficulty:         EASY | MEDIUM | HARD
        test_cases:         Full replacement list of test cases
        constraints:        Updated constraints / input format
        max_points:         Max points
        starter_code_json:  JSON starter code keyed by language
        harness_type:       STDIN_STDOUT | FUNCTION_RETURN
        time_limit_ms:      Per-test time limit in ms
        display_order:      Sort position within the contest
    """
    body: dict = {
        "title": title,
        "statement": statement,
        "difficulty": difficulty,
        "maxPoints": max_points,
        "harnessType": harness_type,
        "timeLimitMs": time_limit_ms,
        "displayOrder": display_order,
        "testCases": test_cases,
    }
    if constraints:
        body["constraints"] = constraints
    if starter_code_json:
        body["starterCodeJson"] = starter_code_json
    return _fmt(_api.put(f"/api/v1/admin/contests/problems/{problem_id}", body))


@mcp.tool()
def delete_contest_problem(problem_id: str) -> str:
    """
    Delete a contest problem and its test cases permanently.

    Args:
        problem_id: UUID of the problem to delete
    """
    _api.delete(f"/api/v1/admin/contests/problems/{problem_id}")
    return f"Contest problem {problem_id} deleted."


# ══════════════════════════════════════════════════════════════════════════════
# ── ALGORITHMS (AlgoViz) ─────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def list_algorithms() -> str:
    """List all algorithm visualizations (admin view — includes drafts)."""
    return _fmt(_api.get("/api/v1/algorithms"))


@mcp.tool()
def get_algorithm(slug: str) -> str:
    """
    Fetch a single algorithm by slug.

    Args:
        slug: Kebab-case slug (e.g. "binary-search")
    """
    return _fmt(_api.get(f"/api/v1/algorithms/{slug}"))


@mcp.tool()
def create_algorithm(
    slug: str,
    title: str,
    visualizer: str,
    spec: dict,
    summary: Optional[str] = None,
    difficulty: Optional[str] = None,
    category: Optional[str] = None,
    java_source: Optional[str] = None,
    python_source: Optional[str] = None,
    is_published: bool = False,
) -> str:
    """
    Create a new algorithm visualization.

    The Java API enforces:
      - slug must be kebab-case (regex validated)
      - title must not be blank
      - visualizer must be a known enum value (ARRAY, GRAPH, STACK, MATRIX)
      - spec must pass AlgorithmSpecValidator (steps, highlights, variables)

    Args:
        slug:          Unique kebab-case identifier (e.g. "bubble-sort")
        title:         Display title
        visualizer:    ARRAY | GRAPH | STACK | MATRIX
        spec:          Visualization spec object (steps, variables, highlights)
        summary:       Short description
        difficulty:    EASY | MEDIUM | HARD
        category:      e.g. "Sorting", "Searching"
        java_source:   Java code snippet shown to students
        python_source: Python code snippet
        is_published:  Publish immediately?
    """
    body: dict = {
        "slug": slug,
        "title": title,
        "visualizer": visualizer,
        "spec": spec,
        "isPublished": is_published,
    }
    if summary:
        body["summary"] = summary
    if difficulty:
        body["difficulty"] = difficulty
    if category:
        body["category"] = category
    if java_source:
        body["javaSource"] = java_source
    if python_source:
        body["pythonSource"] = python_source
    return _fmt(_api.post("/api/v1/algorithms", body))


@mcp.tool()
def publish_algorithm(slug: str, is_published: bool = True) -> str:
    """
    Toggle the published state of an algorithm.

    Args:
        slug:         Kebab-case slug of the algorithm
        is_published: True to publish, False to retract to draft
    """
    return _fmt(_api.put(f"/api/v1/algorithms/{slug}/published",
                          {"isPublished": is_published}))


# ══════════════════════════════════════════════════════════════════════════════
# ── ANIMATION SCENES ─────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def list_animation_scenes() -> str:
    """List all canvas animation scenes (admin view — includes drafts)."""
    return _fmt(_api.get("/api/v1/animation-scenes"))


@mcp.tool()
def create_animation_scene(
    slug: str,
    title: str,
    source: str,
    kind: Optional[str] = None,
    trace: Optional[dict] = None,
    category: Optional[str] = None,
    description: Optional[str] = None,
    is_published: bool = False,
    simulator_params: Optional[dict] = None,
) -> str:
    """
    Create a new canvas animation scene.

    source = AUTHORED  → supply trace (AnimationTrace object)
    source = GENERATED → supply kind (simulator name), optionally simulatorParams

    Args:
        slug:             Unique kebab-case ID
        title:            Display title
        source:           AUTHORED | GENERATED
        kind:             Simulator name (GENERATED only, e.g. "two-sum")
        trace:            AnimationTrace JSON (AUTHORED only)
        category:         Optional category string
        description:      Short description
        is_published:     Publish immediately?
        simulator_params: Optional dict passed to the simulator
    """
    body: dict = {
        "slug": slug,
        "title": title,
        "source": source,
        "isPublished": is_published,
    }
    if kind:
        body["kind"] = kind
    if trace:
        body["trace"] = trace
    if category:
        body["category"] = category
    if description:
        body["description"] = description
    if simulator_params:
        body["simulatorParams"] = simulator_params
    return _fmt(_api.post("/api/v1/animation-scenes", body))


@mcp.tool()
def publish_animation_scene(scene_id: str, is_published: bool = True) -> str:
    """
    Toggle the published state of an animation scene.

    Args:
        scene_id:     UUID of the scene
        is_published: True to publish, False to retract
    """
    return _fmt(_api.put(f"/api/v1/animation-scenes/{scene_id}/published",
                          {"isPublished": is_published}))


# ══════════════════════════════════════════════════════════════════════════════
# ── ROLES ────────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def list_roles() -> str:
    """List all roles (career paths)."""
    return _fmt(_api.get("/api/v1/roles"))


@mcp.tool()
def create_role(name: str, description: Optional[str] = None) -> str:
    """
    Create a new role (career path).

    Args:
        name:        Role name (e.g. "Backend Engineer")
        description: Optional description
    """
    body: dict = {"name": name}
    if description:
        body["description"] = description
    return _fmt(_api.post("/api/v1/roles", body))


# ══════════════════════════════════════════════════════════════════════════════
# ── HEALTH / DIAGNOSTICS ─────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def health_check() -> str:
    """
    Verify that the Java backend is reachable and responding.
    Use this before running bulk operations.
    """
    try:
        result = _api.get("/api/v1/health")
        return f"Backend is healthy: {_fmt(result)}"
    except Exception as exc:
        return f"Backend unreachable: {exc}"


@mcp.tool()
def whoami() -> str:
    """Return the admin identity that the MCP server is authenticated as."""
    email = os.environ.get("ADMIN_EMAIL", "<not set>")
    api_url = BASE_URL
    return f"Authenticated as: {email}\nTarget API:       {api_url}"


# ══════════════════════════════════════════════════════════════════════════════
# ── Entry point ──────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    """Run the MCP server (stdio transport for Claude / other MCP clients)."""
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
