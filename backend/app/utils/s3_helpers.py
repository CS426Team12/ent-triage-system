from app.core.s3 import s3_client, BUCKET_NAME
from datetime import datetime, timedelta, timezone

PRESIGNED_URL_EXPIRATION = 600

def generate_presigned_upload_url(
    file_key: str,
    content_type: str | None = None,
    expires_in: int = PRESIGNED_URL_EXPIRATION
) -> str:
    params = {
        "Bucket": BUCKET_NAME,
        "Key": file_key,
    }

    if content_type:
        params["ContentType"] = content_type

    return s3_client.generate_presigned_url(
        "put_object",
        Params=params,
        ExpiresIn=expires_in
    )



def generate_presigned_download_url(
    file_key: str,
    expires_in: int = PRESIGNED_URL_EXPIRATION
):
    url = s3_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": BUCKET_NAME,
            "Key": file_key,
        },
        ExpiresIn=expires_in
    )

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    return {
        "url": url,
        "expiresAt": expires_at
    }