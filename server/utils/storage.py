import os
import logging
import uuid
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# Fallback local uploads folder
LOCAL_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

def get_s3_client():
    aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    region_name = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
    endpoint_url = os.environ.get("S3_ENDPOINT_URL")

    if not aws_access_key or not aws_secret_key:
        return None

    try:
        session = boto3.Session(
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=region_name
        )
        s3_client = session.client(
            "s3",
            endpoint_url=endpoint_url
        )
        return s3_client
    except Exception as e:
        logger.error(f"Failed to initialize S3 client: {str(e)}")
        return None

def upload_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """
    Uploads a file to S3/R2 if credentials are provided,
    otherwise falls back to saving it in the local server/uploads/ directory.
    Returns the file URL.
    """
    s3_client = get_s3_client()
    bucket_name = os.environ.get("S3_BUCKET_NAME")

    # Generate unique filename to prevent collisions
    ext = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"

    if s3_client and bucket_name:
        try:
            s3_client.put_object(
                Bucket=bucket_name,
                Key=unique_filename,
                Body=file_bytes,
                ContentType=content_type
            )
            endpoint_url = os.environ.get("S3_ENDPOINT_URL")
            if endpoint_url:
                if "cloudflarestorage.com" in endpoint_url:
                    return f"{endpoint_url}/{bucket_name}/{unique_filename}"
                return f"{endpoint_url}/{bucket_name}/{unique_filename}"
            else:
                region = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
                return f"https://{bucket_name}.s3.{region}.amazonaws.com/{unique_filename}"
        except ClientError as e:
            logger.error(f"S3 upload failed, falling back to local storage: {str(e)}")

    # Fallback to local file storage
    try:
        os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)
        local_path = os.path.join(LOCAL_UPLOAD_DIR, unique_filename)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        return f"/api/uploads/{unique_filename}"
    except Exception as e:
        logger.error(f"Local file write failed: {str(e)}")
        raise e

def download_file(file_url: str) -> bytes:
    """
    Downloads file bytes from S3/R2 or local directory based on URL.
    """
    s3_client = get_s3_client()
    bucket_name = os.environ.get("S3_BUCKET_NAME")

    if file_url.startswith("/api/uploads/"):
        filename = file_url.replace("/api/uploads/", "")
        local_path = os.path.join(LOCAL_UPLOAD_DIR, filename)
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                return f.read()
        raise FileNotFoundError("Local file not found.")

    if s3_client and bucket_name:
        try:
            key = file_url.split("/")[-1]
            response = s3_client.get_object(Bucket=bucket_name, Key=key)
            return response["Body"].read()
        except Exception as e:
            logger.error(f"Failed to retrieve file from S3: {str(e)}")
            raise e

    raise ValueError("Storage provider not configured and local file check failed.")

def is_cloud_storage_configured() -> bool:
    """
    Returns True if AWS/R2 credentials and S3_BUCKET_NAME are configured.
    """
    aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    bucket_name = os.environ.get("S3_BUCKET_NAME")
    return bool(aws_access_key and aws_secret_key and bucket_name)

def generate_presigned_url(file_url: str, expiration: int = 3600) -> str:
    """
    Generates a presigned GET URL for an S3/R2 object, or returns the local proxy
    URL (/api/uploads/{filename}) if local storage is used.
    """
    if not file_url:
        return ""

    if file_url.startswith("/api/uploads/"):
        return file_url

    s3_client = get_s3_client()
    bucket_name = os.environ.get("S3_BUCKET_NAME")
    if s3_client and bucket_name:
        try:
            key = file_url.split("/")[-1]
            presigned_url = s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket_name, "Key": key},
                ExpiresIn=expiration
            )
            return presigned_url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {str(e)}")
            return file_url

    return file_url

def delete_file(file_url: str) -> bool:
    """
    Deletes a file from S3/R2 or the local server/uploads/ directory.
    Returns True if successfully deleted, False otherwise.
    """
    if not file_url:
        return False

    if file_url.startswith("/api/uploads/"):
        filename = file_url.replace("/api/uploads/", "")
        local_path = os.path.join(LOCAL_UPLOAD_DIR, filename)
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
                return True
            except Exception as e:
                logger.error(f"Failed to delete local file {local_path}: {str(e)}")
                return False
        return False

    s3_client = get_s3_client()
    bucket_name = os.environ.get("S3_BUCKET_NAME")
    if s3_client and bucket_name:
        try:
            key = file_url.split("/")[-1]
            s3_client.delete_object(Bucket=bucket_name, Key=key)
            return True
        except Exception as e:
            logger.error(f"Failed to delete S3 file {key}: {str(e)}")
            return False

    return False
