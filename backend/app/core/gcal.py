from google.oauth2 import service_account
from googleapiclient.discovery import build
from app.core.config import settings

SCOPES = ["https://www.googleapis.com/auth/calendar"]

credentials = service_account.Credentials.from_service_account_info(
    {
        "type":         "service_account",
        "client_email": settings.GCAL_CLIENT_EMAIL,
        "private_key":  settings.GCAL_PRIVATE_KEY.replace("\\n", "\n"),
        "token_uri":    "https://oauth2.googleapis.com/token",
    },
    scopes=SCOPES,
)

calendar_service = build("calendar", "v3", credentials=credentials)