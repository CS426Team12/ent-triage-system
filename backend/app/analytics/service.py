from sqlmodel import Session, select
from sqlalchemy import func, text
from app.models import TriageCaseChangelog, AIFeedback, TriageCase

def calculate_percentage(part: int, total: int) -> float:
    return round((part / total) * 100, 2) if total > 0 else 0

def get_total_case_count(db: Session) -> int:
    statement = select(func.count()).select_from(TriageCase)
    return db.exec(statement).one()

def get_cases_with_urgency_override(db: Session) -> int:
    statement = select(func.count(func.distinct(TriageCaseChangelog.caseID))).where(
        TriageCaseChangelog.fieldName == "overrideUrgency"
    )
    return db.exec(statement).one()

def get_cases_with_summary_override(db: Session) -> int:
    statement = select(func.count(func.distinct(TriageCaseChangelog.caseID))).where(
        TriageCaseChangelog.fieldName == "overrideSummary",
        TriageCaseChangelog.newValue.is_not(None),
        TriageCaseChangelog.newValue != "",
    )
    return db.exec(statement).one()

def get_cases_with_feedback(db: Session) -> int:
    statement = select(func.count(func.distinct(AIFeedback.caseID)))
    return db.exec(statement).one()

def get_total_feedback(db: Session) -> int:
    statement = select(func.count()).select_from(AIFeedback).where(AIFeedback.rating.is_not(None))
    return db.exec(statement).one()

def get_feedback_counts(db: Session):
    statement = (
        select(AIFeedback.rating, func.count())
        .group_by(AIFeedback.rating)
    )

    results = db.exec(statement).all()

    counts = {"up": 0, "down": 0}
    for rating, count in results:
        counts[rating] = count

    return counts


def get_tag_counts(db: Session):
    query = text("""
        SELECT tag, COUNT(*) as count
        FROM ent."AIFeedback",
        unnest(tags) as tag
        WHERE rating = 'down'
        GROUP BY tag
        ORDER BY count DESC
    """)

    result = db.exec(query).all()

    return [{"tag": row[0], "count": row[1]} for row in result]

def get_ai_analytics(db: Session):
    total_cases = get_total_case_count(db)

    urgency_cases = get_cases_with_urgency_override(db)
    summary_cases = get_cases_with_summary_override(db)
    feedback_cases = get_cases_with_feedback(db)
    total_feedback = get_total_feedback(db)

    return {
        "totals": {
            "cases": total_cases,
            "feedback": total_feedback,
        },
        "cases": {
            "urgency_override": urgency_cases,
            "summary_override": summary_cases,
            "with_feedback": feedback_cases,
        },
        "percentages": {
            "urgency_override": calculate_percentage(urgency_cases, total_cases),
            "summary_override": calculate_percentage(summary_cases, total_cases),
            "with_feedback": calculate_percentage(feedback_cases, total_cases),
        },
        "ratings": get_feedback_counts(db),
        "tags": get_tag_counts(db),
    }