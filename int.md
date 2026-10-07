# ATLAS Quiz AI: Fix Specification (for opencode)


You are modifying an existing FastAPI backend for "ATLAS", a learning platform. The Quiz AI feature has these bugs:

1. Subject bleed: a "Basic Math" or "English Grammar" quiz contains Python code or output questions.
2. Language mixing: an English quiz sometimes contains Urdu.
3. 502 errors: LaTeX backslashes (`\frac`, `\times`, `\sqrt`) break `json.loads()`.
4. Prompt refusals ("I can't comply") caused by too many negative constraints.

Root cause: the backend leaks irrelevant context (notes, roadmap, "mixed" question kinds) to the LLM. The backend must decide subject, language, allowed question kinds and context. The prompt only describes the job.

Rules for this task:
- First inspect the existing quiz endpoint in `routes.py`, the Note / Course / Roadmap models, and the LLM client. Adapt the code below to the real names and fields. Do not duplicate existing helpers.
- Keep clean architecture: put the new logic in `quiz_service.py` (or the existing services folder), keep `routes.py` thin.
- Keep the existing request fields (course_id, topic, question_type, difficulty, num_questions, PDF upload). Do not change the frontend contract except where Section 7 says so.
- Never send irrelevant notes to the LLM. This is the most important rule.
- After the change, run the test cases in Section 8.

---

## 1. UI behavior to implement (source of truth)

The Quiz page has: Course dropdown (default "General", meaning no course attached), Custom topic text box, optional Syllabus PDF, Question Type (Mixed set, etc.), Difficulty, Number of questions (5/10/15).

| Course | Custom topic box | What the AI receives |
|---|---|---|
| General (none) | Topic written | ONLY the topic. No notes, no roadmap, no course data. Mode `topic_only` |
| Course selected | Empty | Completed roadmap topics, then notes of only those topics. Mode `course` |
| Course selected | Text written | Same course context, and the text is a FOCUS instruction (e.g. "focus on loops"), not a topic. Mode `course_focus` |
| General (none) | Empty + PDF | PDF text only. Mode `pdf` |
| General (none) | Empty, no PDF | Return HTTP 400 |

Domain rules:
- `topic_only`: domain comes from classifying the topic text.
- `course` and `course_focus`: domain comes from the COURSE (stored field `course.domain`), never from the focus text.
- `pdf`: classify the first 2000 characters of PDF text.

Question kinds rules (decided by the backend, never by the UI or the AI):
- Domain is not `programming`: kinds = `["mcq"]` always, even when the UI says "Mixed set".
- Domain is `programming`: "mixed" means `["mcq","code","debug","output"]`, otherwise the single requested kind.
- For non-programming + "mixed": add a style hint so the quiz still varies (conceptual, calculation, true/false-style, word problems), all as 4-option MCQ.

---

## 2. Data model changes

Add `domain` to the Course model (string, one of `math, english, science, humanities, programming, other`).
- Set it when a course is created (use `classify_domain` on the course title).
- Backfill existing courses with a one-time script or lazy fallback: if `course.domain` is empty, classify the title, save it, and continue.

Notes should have `course_id` and a link to a roadmap topic (id or title). If the link does not exist, add it, because `course` mode needs "notes of completed topics only".

---

## 3. New file: `quiz_service.py`

```python
# quiz_service.py
import json
import re
from dataclasses import dataclass, field
from typing import List, Optional

from fastapi import HTTPException
from pydantic import BaseModel, Field, ValidationError, field_validator

# =====================================================================
# 1. DOMAIN + KINDS
# =====================================================================

VALID_DOMAINS = {"math", "english", "science", "humanities", "programming", "other"}
ALL_KINDS = ["mcq", "code", "debug", "output"]

CLASSIFY_SYSTEM = """You classify a quiz topic into exactly one subject area.
Reply with one word from this list and nothing else:
math, english, science, humanities, programming, other"""


async def classify_domain(text: str, call_llm_small) -> str:
    """call_llm_small(system, user) -> str. Use the cheapest/fastest model, temperature 0."""
    try:
        raw = await call_llm_small(CLASSIFY_SYSTEM, f"Topic: {text[:500]}")
        word = raw.strip().lower().split()[0].strip(".,\"'")
        return word if word in VALID_DOMAINS else "other"
    except Exception:
        return "other"


def kinds_for(domain: str, requested: str) -> List[str]:
    if domain != "programming":
        return ["mcq"]
    return ALL_KINDS if requested in ("mixed", "", None) else [requested]


def style_for(domain: str, requested: str) -> str:
    if domain != "programming" and requested in ("mixed", "", None):
        return ("Vary the styles: conceptual questions, calculations or applications, "
                "true/false-style statements, and short word problems. All as 4-option MCQs.")
    return "Keep a natural balance of question styles."


# =====================================================================
# 2. LANGUAGE (decided by backend, never inferred by the LLM)
# =====================================================================

URDU_RE = re.compile(r"[\u0600-\u06FF]")


def resolve_language(requested: Optional[str], text: str) -> str:
    if requested:
        return requested
    return "Urdu" if URDU_RE.search(text or "") else "English"


# =====================================================================
# 3. NOTE FILTERING (used only in course / course_focus modes)
# =====================================================================

CODE_PATTERNS = re.compile(
    r"(```|\bdef\s+\w+\(|\bimport\s+\w+|\bprint\(|\bfor\s+\w+\s+in\s|\bclass\s+\w+|=>|</?\w+>)",
    re.MULTILINE,
)


def looks_like_code(text: str) -> bool:
    return len(CODE_PATTERNS.findall(text or "")) >= 2


def pick_notes(notes: list, completed_titles: List[str], focus: str, domain: str,
               max_notes: int = 8, max_chars: int = 6000) -> str:
    """
    notes: Note objects already limited to this course.
    Keeps only notes of completed roadmap topics. If a focus is given,
    notes whose title/content match the focus words are ranked first.
    """
    done = {t.lower() for t in completed_titles}
    pool = [n for n in notes if (getattr(n, "roadmap_topic_title", "") or "").lower() in done]

    if domain != "programming":
        pool = [n for n in pool if not looks_like_code(f"{n.title}\n{n.content}")]

    if focus:
        words = [w for w in re.findall(r"\w+", focus.lower()) if len(w) > 2]
        def score(n):
            blob = f"{n.title} {n.content}".lower()
            return sum(1 for w in words if w in blob)
        pool.sort(key=score, reverse=True)

    out, total = [], 0
    for n in pool[:max_notes]:
        chunk = f"[{n.title}]\n{n.content}".strip()[: max_chars - total]
        if not chunk:
            break
        out.append(chunk)
        total += len(chunk)
    return "\n\n---\n\n".join(out) if out else "No notes provided."


# =====================================================================
# 4. QUIZ PLAN (single source of truth for one generation)
# =====================================================================

@dataclass
class QuizPlan:
    mode: str                      # topic_only | course | course_focus | pdf
    topic: str                     # topic_only: user topic | course: course title | pdf: "Uploaded PDF"
    domain: str
    kinds: List[str]
    language: str
    notes_text: str = ""
    roadmap_topics: List[str] = field(default_factory=list)
    focus: str = ""
    style_hint: str = ""


async def build_plan(req, user, db, pdf_text: Optional[str], call_llm_small) -> QuizPlan:
    text = (req.topic or "").strip()
    qtype = getattr(req, "question_type", "mixed")
    lang_req = getattr(req, "language", None)

    # A) General + custom topic: topic ONLY, no notes, no roadmap
    if not req.course_id and text:
        domain = await classify_domain(text, call_llm_small)
        return QuizPlan("topic_only", text, domain, kinds_for(domain, qtype),
                        resolve_language(lang_req, text),
                        style_hint=style_for(domain, qtype))

    # B/C) Course selected: roadmap -> completed topics -> notes, text is a focus instruction
    if req.course_id:
        course = db.get_course(user.id, req.course_id)
        if not course:
            raise HTTPException(404, "Course not found.")
        if not getattr(course, "domain", None):
            course.domain = await classify_domain(course.title, call_llm_small)
            db.save_course(course)
        domain = course.domain

        done = [t.title for t in db.get_roadmap_topics(course.id) if t.completed]
        if not done:
            raise HTTPException(400, "No completed topics in this course yet.")

        notes = db.get_notes(user.id, course_id=course.id)
        notes_text = pick_notes(notes, done, text, domain)
        return QuizPlan("course_focus" if text else "course", course.title, domain,
                        kinds_for(domain, qtype),
                        resolve_language(lang_req, course.title),
                        notes_text=notes_text, roadmap_topics=done, focus=text,
                        style_hint=style_for(domain, qtype))

    # D) PDF only
    if pdf_text:
        domain = await classify_domain(pdf_text[:2000], call_llm_small)
        return QuizPlan("pdf", "Uploaded PDF", domain, kinds_for(domain, qtype),
                        resolve_language(lang_req, pdf_text[:500]),
                        notes_text=pdf_text[:8000], style_hint=style_for(domain, qtype))

    raise HTTPException(400, "Write a topic, choose a course, or upload a PDF.")


# =====================================================================
# 5. PROMPTS
# =====================================================================

SYSTEM_TEMPLATE = """You are ATLAS Exam Writer, a calm and precise quiz author for a learning platform.
You write clear, accurate quizzes on one subject at a time.

<assignment>
Mode: <<MODE>>
Subject area: <<SUBJECT_DOMAIN>>
Topic or course: <<TOPIC>>
Quiz language: <<LANGUAGE>>
Number of questions: <<NUM_QUESTIONS>>
Difficulty: <<DIFFICULTY>>
Allowed question kinds: <<ALLOWED_KINDS>>
Style guidance: <<STYLE_HINT>>
</assignment>

<mode_guide>
topic_only: The topic above is your whole brief. Write the quiz from standard curriculum knowledge of that topic.
course: The learner is studying the course above. The completed roadmap topics and the learner's notes appear in the user message. Cover those topics, and use the notes to match the depth and wording the learner studied.
course_focus: Same as course, and the learner also gave a focus request in <focus>. Choose the roadmap topics and notes that match the focus, and build most of the quiz around it. If the focus names something outside the course, cover it within the course's subject area.
pdf: The PDF text in the user message is your source. Cover its main ideas.
</mode_guide>

<how_you_work>
1. Every question belongs to the subject area above and the material for this mode.
2. You write every word of the quiz (questions, options, explanations) in <<LANGUAGE>>.
3. You write mathematics in plain text with Unicode symbols: 1/2, 3 × 4, √16, x², π, ≤, ≥, ≠.
4. Your reply is one JSON object and nothing else: it starts with { and ends with }.
   There are no code fences and no text outside it.
   Inside strings, the only backslash sequences are \\" and \\n.
5. Each question has exactly four options and exactly one correct answer.
   Wrong options are plausible. The explanation is one or two short sentences.
6. Difficulty "easy" tests recall and direct application, "medium" tests application and
   short reasoning, "hard" tests multi-step reasoning and tricky distinctions.
</how_you_work>

<output_format>
{
  "topic": "<<TOPIC>>",
  "language": "<<LANGUAGE>>",
  "questions": [
    {
      "id": 1,
      "kind": "mcq",
      "question": "text of the question",
      "code": "",
      "options": ["first", "second", "third", "fourth"],
      "answer_index": 0,
      "explanation": "why the answer is correct"
    }
  ]
}
The "code" field stays an empty string unless the kind is code, debug or output,
which are available only when the allowed kinds list contains them.
</output_format>

You always deliver the full quiz. If the material is thin, you complete it with
standard knowledge of the subject."""


def build_system_prompt(plan: QuizPlan, n: int, difficulty: str) -> str:
    return (SYSTEM_TEMPLATE
            .replace("<<MODE>>", plan.mode)
            .replace("<<SUBJECT_DOMAIN>>", plan.domain)
            .replace("<<TOPIC>>", plan.topic)
            .replace("<<LANGUAGE>>", plan.language)
            .replace("<<NUM_QUESTIONS>>", str(n))
            .replace("<<DIFFICULTY>>", difficulty)
            .replace("<<ALLOWED_KINDS>>", ", ".join(plan.kinds))
            .replace("<<STYLE_HINT>>", plan.style_hint))


def build_user_message(plan: QuizPlan) -> str:
    parts = ["Create the quiz now."]
    if plan.mode in ("course", "course_focus"):
        parts.append("<completed_roadmap_topics>\n" + "\n".join(plan.roadmap_topics)
                     + "\n</completed_roadmap_topics>")
        parts.append(f"<notes>\n{plan.notes_text}\n</notes>")
    if plan.mode == "course_focus":
        parts.append(f"<focus>\n{plan.focus}\n</focus>")
    if plan.mode == "pdf":
        parts.append(f"<pdf_text>\n{plan.notes_text}\n</pdf_text>")
    # topic_only: nothing else. No notes block at all.
    return "\n\n".join(parts)


# =====================================================================
# 6. JSON SANITIZER (fixes the 502s)
# =====================================================================

LATEX_MAP = {
    r"\times": "×", r"\cdot": "·", r"\div": "÷", r"\pm": "±", r"\pi": "π",
    r"\leq": "≤", r"\le": "≤", r"\geq": "≥", r"\ge": "≥", r"\neq": "≠", r"\ne": "≠",
    r"\approx": "≈", r"\infty": "∞", r"\theta": "θ", r"\alpha": "α", r"\beta": "β",
    r"\degree": "°", r"\circ": "°", r"\rightarrow": "→", r"\to": "→", r"\Delta": "Δ",
}
_KEYS = sorted(LATEX_MAP, key=len, reverse=True)
_LATEX_RE = re.compile("|".join(re.escape(k) + r"(?![A-Za-z])" for k in _KEYS))


def _frac(m):
    a, b = m.group(1).strip(), m.group(2).strip()
    wrap = lambda s: s if re.fullmatch(r"[\w.]+", s) else f"({s})"
    return f"{wrap(a)}/{wrap(b)}"


def sanitize_llm_json(raw: str) -> str:
    s = raw.strip()
    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s, flags=re.IGNORECASE)
    start, end = s.find("{"), s.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found")
    s = s[start:end + 1]

    # Convert LaTeX BEFORE escape cleanup, because \frac and \times look like valid JSON escapes (\f, \t)
    for _ in range(3):
        s = re.sub(r"\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}", _frac, s)
    s = re.sub(r"\\sqrt\s*\{([^{}]*)\}", r"√(\1)", s)
    s = re.sub(r"\\sqrt\b", "√", s)
    s = _LATEX_RE.sub(lambda m: LATEX_MAP[m.group(0)], s)
    s = re.sub(r"\\[()\[\]]", "", s)
    s = s.replace("$", "")
    s = re.sub(r"\^\{?2\}?", "²", s)
    s = re.sub(r"\^\{?3\}?", "³", s)

    # Drop any backslash that is not a legitimate JSON escape
    s = re.sub(r'\\(?!["\\/nrt]|u[0-9a-fA-F]{4})', "", s)
    return s


# =====================================================================
# 7. VALIDATION
# =====================================================================

class Question(BaseModel):
    id: int
    kind: str
    question: str
    code: str = ""
    options: List[str]
    answer_index: int
    explanation: str = ""

    @field_validator("options")
    @classmethod
    def four_options(cls, v):
        if len(v) != 4:
            raise ValueError("need exactly 4 options")
        return v


class Quiz(BaseModel):
    topic: str
    language: str
    questions: List[Question] = Field(min_length=1)


def validate_quiz(data: dict, plan: QuizPlan, n: int) -> Quiz:
    quiz = Quiz(**data)
    if len(quiz.questions) < max(1, n - 1):
        raise ValueError(f"expected about {n} questions, got {len(quiz.questions)}")
    for q in quiz.questions:
        blob = f"{q.question} {q.code} {' '.join(q.options)} {q.explanation}"
        if q.kind not in plan.kinds:
            raise ValueError(f"kind '{q.kind}' not allowed for {plan.domain}")
        if not 0 <= q.answer_index < 4:
            raise ValueError("answer_index out of range")
        if plan.domain != "programming" and (q.code.strip() or "```" in blob or looks_like_code(blob)):
            raise ValueError("code content in a non-programming quiz")
        has_urdu = bool(URDU_RE.search(blob))
        if plan.language == "English" and has_urdu:
            raise ValueError("Urdu text in an English quiz")
        if plan.language == "Urdu" and not has_urdu:
            raise ValueError("English-only text in an Urdu quiz")
    return quiz


# =====================================================================
# 8. GENERATION WITH RETRY
# =====================================================================

async def generate_quiz(plan: QuizPlan, n: int, difficulty: str, call_llm) -> Quiz:
    """
    call_llm(system: str, user: str) -> str
    Use the existing LLM client. Enable JSON mode / structured output if the provider supports it.
    Temperature about 0.3.
    """
    system = build_system_prompt(plan, n, difficulty)
    user = build_user_message(plan)

    last_err = ""
    for _ in range(3):
        nudge = ""
        if last_err:
            nudge = (f"\n\nYour previous reply could not be used ({last_err}). "
                     f"Please send the complete quiz again as one JSON object, in {plan.language}, "
                     f"using only these kinds: {', '.join(plan.kinds)}.")
        try:
            raw = await call_llm(system, user + nudge)
            data = json.loads(sanitize_llm_json(raw))
            return validate_quiz(data, plan, n)
        except (ValueError, ValidationError, json.JSONDecodeError) as e:
            last_err = str(e)[:200]
            print("QUIZ_REJECTED:", last_err)  # replace with the project's logger
    raise RuntimeError(f"Quiz generation failed: {last_err}")
```

---

## 4. Route change in `routes.py`

Replace the body of the existing quiz endpoint with this shape (keep the project's real dependency names and request model):

```python
from fastapi import APIRouter, Depends, HTTPException
from quiz_service import build_plan, generate_quiz

router = APIRouter()

@router.post("/quiz/generate")
async def quiz_generate(req: QuizRequest, user=Depends(get_current_user), db=Depends(get_db)):
    pdf_text = await extract_pdf_text_if_any(req)   # reuse the existing PDF logic; delete the file after reading, as the UI promises

    plan = await build_plan(req, user, db, pdf_text, call_llm_small)

    # TEMPORARY DEBUG: remove after verifying the test cases
    print("MODE:", plan.mode, "| DOMAIN:", plan.domain, "| KINDS:", plan.kinds,
          "| LANG:", plan.language, "| NOTES LEN:", len(plan.notes_text))

    try:
        quiz = await generate_quiz(
            plan,
            n=req.num_questions or 10,
            difficulty=req.difficulty or "medium",
            call_llm=call_llm,
        )
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Quiz could not be generated, please retry.")
    return quiz.model_dump()
```

Notes for the agent:
- `call_llm` is the existing LLM client wrapped as `async (system, user) -> str`.
- `call_llm_small` is the same client with the cheapest model, temperature 0, max tokens about 10. If only one model exists, reuse it.
- The endpoint must never let a parser exception reach the gateway. A clean 503 is the failure path.

---

## 5. Cleanup tasks (important)

Search the whole backend and remove or fix:
1. Any old quiz prompt text containing "FORBIDDEN", "STRICTLY", "DO NOT", "past mistakes", "I can't comply", or Python examples (`python`, `print(`, `def `). These cause refusals and subject bleed.
2. Any code that fetches all of the user's notes when `course_id` is empty.
3. Any place where "mixed" is expanded to `["mcq","code","debug","output"]` without checking the domain.
4. Any phrase like "auto-detect format from notes" in prompts.
5. Notes pasted into the system prompt. Notes belong in the user message only.

---

## 6. Prompt design principles (do not break these when editing)

- Positive instructions only. Describe what to produce, not what to avoid.
- No capital-letter shouting, no "forbidden/absolute" wording.
- Do not mention Python, code, Urdu or LaTeX examples in the prompt unless the mode needs them.
- The backend decides domain, language, kinds and context. The prompt receives them as fixed values.
- Output is validated and retried in the backend.

---

## 7. Frontend change

In the Question Type dropdown, the "Mixed set" subtitle says "All four types, shuffled". When the topic or course domain is not programming, show "Mixed styles (MCQ)" instead. If the domain is unknown on the client, keep the current text.

When a course is selected, change the Custom topic label and placeholder to something like: "Focus (optional): e.g. loops and functions only". Keep the original label when Course = General.

---

## 8. Test cases (run all, report results)

| # | Input | Expected |
|---|---|---|
| 1 | General + "Basic Math", Mixed, 10 questions | domain=math, kinds=["mcq"], notes empty, no code, no backslashes, all English |
| 2 | General + "English Grammar" | domain=english, kinds=["mcq"], all English, no Urdu |
| 3 | General + "Python list comprehensions", Mixed | domain=programming, kinds include code/debug/output |
| 4 | Python course, empty box | mode=course, only completed topics' notes, domain from course |
| 5 | Python course + "loops and functions only" | mode=course_focus, most questions on loops/functions |
| 6 | General + empty + PDF | mode=pdf |
| 7 | General + empty, no PDF | HTTP 400 |
| 8 | Math topic with LaTeX in the LLM reply (mock `\frac{1}{2}`, `\times`) | sanitizer converts to `1/2`, `×`, no crash |

Also add unit tests for `sanitize_llm_json`, `kinds_for`, `build_plan` (all four modes) and `validate_quiz` (rejects code in math, Urdu in English).

---

## 9. Definition of done

- No code or Python content in non-programming quizzes.
- No language mixing.
- No 502 from JSON parsing.
- No refusal messages.
- General + custom topic sends zero notes to the LLM.
- Course mode uses roadmap-completed topics and their notes only.
- Debug print removed after verification.