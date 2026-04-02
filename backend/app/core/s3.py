import boto3
from app.core.config import settings 

s3_client = boto3.client(
    "s3",
    aws_access_key_id=str(settings.AWS_ACCESS_KEY_ID),
    aws_secret_access_key=str(settings.AWS_SECRET_ACCESS_KEY),
    region_name=str(settings.AWS_REGION)
)

BUCKET_NAME = str(settings.S3_BUCKET_NAME)