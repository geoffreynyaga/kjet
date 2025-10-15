// In production, use S3 URL. In development, use empty string for local files
export const s3BaseUrl = process.env.NODE_ENV === 'production'
  ? (process.env.REACT_APP_S3_ENDPOINT_URL || "")
  : "";
