# Unified Storage System

This storage system dynamically uses either Cloudinary or Cloudflare R2 based on database configuration.

## Features

- ✅ Database-driven configuration (no env vars needed)
- ✅ Automatic provider switching
- ✅ Encrypted credentials in database
- ✅ Support for both Cloudinary and Cloudflare R2
- ✅ Unified API for upload/delete operations

## Configuration

1. Go to **Settings** page in the dashboard
2. Choose your storage provider (Cloudinary or R2)
3. Enter your credentials
4. Save configuration

The system will automatically use the configured provider for all image operations.

## Usage

### Upload a file

```typescript
import { uploadFile } from "@/lib/storage"

const result = await uploadFile(buffer, {
  folder: "timesheet",
  filename: "my-image.jpg"
})

console.log(result.url) // Public URL
console.log(result.publicId) // For deletion
console.log(result.provider) // "cloudinary" or "r2"
```

### Delete a file

```typescript
import { deleteFile } from "@/lib/storage"

await deleteFile(publicId)
```

### Delete old files

```typescript
import { deleteFilesOlderThanDate } from "@/lib/storage"

const { deleted, errors } = await deleteFilesOlderThanDate("2024-01-01", "timesheet")
```

## Providers

### Cloudinary
- Cloud-based image management
- Automatic optimization
- CDN delivery
- Transformations support

### Cloudflare R2
- S3-compatible storage
- No egress fees
- Global distribution
- Cost-effective for large volumes

## Migration

If you're switching providers:

1. Configure the new provider in Settings
2. Save configuration
3. New uploads will use the new provider
4. Old images remain in the previous provider
5. Optionally migrate old images manually

## Environment Variables

No environment variables needed! All configuration is stored in the database with encrypted secrets.

For development, you can still use `.env` for the old Cloudinary implementation, but it's recommended to use the database configuration.
