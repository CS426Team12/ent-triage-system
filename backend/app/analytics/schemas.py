from typing import List, Optional
from pydantic import BaseModel

class FeedbackCounts(BaseModel):
    up: int
    down: int

class TagCount(BaseModel):
    tag: str
    count: int

class TotalCounts(BaseModel):
    cases: int
    feedback: int

class CaseCounts(BaseModel):
    urgency_override: int
    summary_override: int
    with_feedback: int

class PercentageCounts(BaseModel):
    urgency_override: float
    summary_override: float
    with_feedback: float

class AIAnalyticsResponse(BaseModel):
    totals: TotalCounts
    cases: CaseCounts
    percentages: PercentageCounts
    ratings: FeedbackCounts
    tags: List[TagCount]