from sqlmodel import Session, select
from sqlalchemy import func, text
from app.models import TriageCaseChangelog, AIFeedback

def get_urgency_overrides(db: Session) -> int:
    statement = select(func.count()).where(
        TriageCaseChangelog.fieldName == "overrideUrgency"
    )
    return db.exec(statement).one()

def get_override_summaries(db: Session) -> int:
    statement = select(func.count()).where(
        TriageCaseChangelog.fieldName == "overrideSummary",
        TriageCaseChangelog.newValue.is_not(None),
        TriageCaseChangelog.newValue != "",
    )
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
    return {
        "urgency_overrides": get_urgency_overrides(db),
        "override_summaries": get_override_summaries(db),
        "feedback": get_feedback_counts(db),
        "tags": get_tag_counts(db),
    }