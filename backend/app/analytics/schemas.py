from typing import List, Optional
from pydantic import BaseModel


class FeedbackCounts(BaseModel):
    up: int
    down: int


class TagCount(BaseModel):
    tag: str
    count: int


class AIAnalyticsResponse(BaseModel):
    urgency_overrides: int
    override_summaries: int
    feedback: FeedbackCounts
    tags: List[TagCount]