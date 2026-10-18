#!/usr/bin/env python3
"""
validate-course.py
==================
A standalone validation script that checks whether a course created by the
UnlearnArc Course Architect skill is complete and correctly structured.

Usage:
    python3 validate-course.py <course_name_or_id>

This script calls the same MCP/API endpoints used by the skill and prints a
structured report. It is intended as a development / smoke-test tool, NOT as
a replacement for the skill's built-in Phase 9 validation.

Requirements:
    - UNLEARNARC_API_URL, ADMIN_EMAIL, ADMIN_PASSWORD in environment or .env file
    - httpx: pip install httpx
    - python-dotenv (optional): pip install python-dotenv

Exit code:
    0 — course is complete
    1 — validation errors found
    2 — course not found
"""

from __future__ import annotations

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Any, Optional

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent.parent / "mcp" / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

try:
    import httpx
except ImportError:
    print("ERROR: httpx is required. Install with: pip install httpx")
    sys.exit(1)


BASE_URL = os.environ.get("UNLEARNARC_API_URL", "http://localhost:8085")
TIMEOUT = httpx.Timeout(30.0)


# ── Auth ─────────────────────────────────────────────────────────────────────

def get_token() -> str:
    email = os.environ.get("ADMIN_EMAIL", "")
    password = os.environ.get("ADMIN_PASSWORD", "")
    if not email or not password:
        print("ERROR: Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.")
        sys.exit(1)
    resp = httpx.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email": email, "password": password},
        timeout=TIMEOUT,
    )
    if resp.status_code != 200:
        print(f"ERROR: Login failed ({resp.status_code}): {resp.text[:300]}")
        sys.exit(1)
    payload = resp.json()
    data = payload.get("data") or payload
    return data["accessToken"]


# ── API helpers ───────────────────────────────────────────────────────────────

def api_get(token: str, path: str) -> Any:
    resp = httpx.get(
        f"{BASE_URL}{path}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    if not resp.is_success:
        return None
    payload = resp.json()
    if isinstance(payload, dict) and "data" in payload:
        return payload["data"]
    return payload


# ── Validation ────────────────────────────────────────────────────────────────

def find_course(token: str, query: str) -> Optional[dict]:
    courses = api_get(token, "/api/v1/courses") or []
    query_lower = query.lower()
    # Exact match first
    for c in courses:
        if c.get("name", "").lower() == query_lower:
            return c
    # UUID match
    for c in courses:
        if c.get("id", "") == query:
            return c
    # Partial match
    for c in courses:
        if query_lower in c.get("name", "").lower():
            return c
    return None


def validate_course(course_name: str) -> int:
    print(f"\n{'='*60}")
    print(f"  UnlearnArc Course Architect — Validation Report")
    print(f"  Course: {course_name}")
    print(f"{'='*60}\n")

    token = get_token()

    # Find course
    course = find_course(token, course_name)
    if not course:
        print(f"❌ COURSE NOT FOUND: '{course_name}'")
        print("   Check the name or run the architect skill first.")
        return 2

    course_id = course["id"]
    print(f"✅ Course found: {course['name']}")
    print(f"   ID:    {course_id}")
    print(f"   Level: {course.get('level', '?')}")
    print(f"   Topics count (declared): {course.get('topicsCount', '?')}\n")

    errors: list[str] = []
    warnings: list[str] = []
    stats = {
        "topics": 0,
        "notes": 0,
        "published_notes": 0,
        "pools": 0,
        "questions": 0,
        "topics_no_notes": [],
        "topics_no_pool": [],
        "topics_no_questions": [],
    }

    # Topics
    topics = api_get(token, f"/api/v1/topics/course/{course_id}") or []
    stats["topics"] = len(topics)

    if not topics:
        errors.append("Course has no topics.")
    else:
        print(f"Topics ({len(topics)}):")

    for topic in topics:
        tid = topic["id"]
        tname = topic.get("name", "?")
        print(f"\n  [{topic.get('topicOrder', '?')}] {tname}")

        # Notes
        notes = api_get(token, f"/api/v1/notes/admin/topic/{tid}") or []
        stats["notes"] += len(notes)
        published = [n for n in notes if n.get("isPublished")]
        stats["published_notes"] += len(published)

        if not notes:
            errors.append(f"Topic '{tname}' has no notes.")
            stats["topics_no_notes"].append(tname)
            print("      ❌ No notes")
        else:
            unpublished = len(notes) - len(published)
            status = "✅" if published else "⚠️"
            print(f"      {status} Notes: {len(notes)} ({len(published)} published, {unpublished} draft)")
            if not published:
                warnings.append(f"Topic '{tname}' notes are all unpublished (drafts).")

        # Question pools
        pools = api_get(token, f"/api/v1/question-pools/by-topic/{tid}") or []
        stats["pools"] += len(pools)

        if not pools:
            errors.append(f"Topic '{tname}' has no question pool.")
            stats["topics_no_pool"].append(tname)
            print("      ❌ No question pool")
        else:
            for pool in pools:
                pid = pool["id"]
                pname = pool.get("name", "?")
                total_q = pool.get("totalQuestions", 0)
                easy = pool.get("easyCount", 0)
                med = pool.get("mediumCount", 0)
                hard = pool.get("hardCount", 0)

                # Pool count integrity
                if easy + med + hard != total_q:
                    errors.append(
                        f"Pool '{pname}': easyCount+mediumCount+hardCount "
                        f"({easy}+{med}+{hard}={easy+med+hard}) ≠ totalQuestions ({total_q})."
                    )

                # Questions in pool
                questions = api_get(token, f"/api/v1/questions/pool/{pid}") or []
                q_count = len(questions)
                stats["questions"] += q_count

                active_questions = [q for q in questions if q.get("active", True)]

                if q_count == 0:
                    errors.append(f"Pool '{pname}' has no questions.")
                    stats["topics_no_questions"].append(tname)
                elif q_count < total_q:
                    warnings.append(
                        f"Pool '{pname}' has {q_count} questions but draws {total_q} per session — "
                        "quiz session may not fill."
                    )

                # Check difficulty distribution
                easy_q = len([q for q in active_questions if q.get("difficulty") == "EASY"])
                med_q  = len([q for q in active_questions if q.get("difficulty") == "MEDIUM"])
                hard_q = len([q for q in active_questions if q.get("difficulty") == "HARD"])

                if easy_q < easy:
                    errors.append(
                        f"Pool '{pname}' needs {easy} EASY questions but has {easy_q}."
                    )
                if med_q < med:
                    errors.append(
                        f"Pool '{pname}' needs {med} MEDIUM questions but has {med_q}."
                    )
                if hard_q < hard:
                    errors.append(
                        f"Pool '{pname}' needs {hard} HARD questions but has {hard_q}."
                    )

                print(f"      ✅ Pool: {pname} | {q_count} questions ({easy_q}E/{med_q}M/{hard_q}H)")

    # Summary
    print(f"\n{'='*60}")
    print("  Summary")
    print(f"{'='*60}")
    print(f"  Topics:           {stats['topics']}")
    print(f"  Notes:            {stats['notes']} ({stats['published_notes']} published)")
    print(f"  Question pools:   {stats['pools']}")
    print(f"  Questions:        {stats['questions']}")

    if errors:
        print(f"\n❌ ERRORS ({len(errors)}):")
        for e in errors:
            print(f"   • {e}")

    if warnings:
        print(f"\n⚠️  WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"   • {w}")

    if not errors and not warnings:
        print("\n✅ Course validation passed. All content appears complete.")
    elif not errors:
        print("\n✅ No blocking errors. Review warnings above.")
    else:
        print(f"\n❌ Validation failed with {len(errors)} error(s).")

    print(f"{'='*60}\n")
    return 0 if not errors else 1


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate a course created by the UnlearnArc Course Architect skill."
    )
    parser.add_argument(
        "course",
        help="Course name (partial match) or UUID."
    )
    args = parser.parse_args()
    sys.exit(validate_course(args.course))


if __name__ == "__main__":
    main()
