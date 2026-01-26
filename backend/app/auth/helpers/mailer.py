from fastapi import APIRouter
import resend
from app.core.config import settings
from app.core.security import (EmailTokenType, create_email_token)
import logging

logger = logging.getLogger(__name__)

resend.api_key = str(settings.RESEND_API_KEY)
TEST_EMAIL_RECIPIENT = str(settings.TEST_EMAIL_RECIPIENT) # without our own domain, we can only send it to our registered email and from test email for now
TEST_EMAIL_SENDER = str(settings.TEST_EMAIL_SENDER) 

router = APIRouter(prefix="/mailer", tags=["mailer"])

def send_template_email(from_email: str = TEST_EMAIL_SENDER, to_email: str = TEST_EMAIL_RECIPIENT, template_name: str = "", link: str = "") -> bool:
    try:
      params: resend.Emails.SendParams = {
          "from": from_email,
          "to": [to_email],
          "template": {
          "id": template_name,
          "variables": {
            "link": link,
          },
        },
      }
      email: resend.Emails.SendResponse = resend.Emails.send(params)
      logger.info(f"Email '{template_name}' sent successfully to {to_email}")
      return True
    except Exception as e:
      logger.error(f"Failed to send '{template_name}' email to {to_email}: {str(e)}") 
      return False

def send_token_email(user_email: str, user_id: str, token_type: EmailTokenType, template_name: str, base_url: str) -> bool:
    try:
        token = create_email_token(
            {"sub": user_id}, 
            token_type
        )
        
        link = f"{base_url}?token={token}"
        send_template_email(
            # to_email=request.email, for now we're using testing emails only
            template_name=template_name,
            link=link
        )
        
    except Exception as e:
        logger.error(f"Failed to create token and send email to {user_email}: {str(e)}")
        return False