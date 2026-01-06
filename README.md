# AWS S3 Bulk Downloader

A Node.js script to download files from AWS S3 bucket in bulk, preserving folder structure. Supports multiple parent folders, automatic resume, and file type filtering.

## Features

✅ Downloads from multiple parent folders in one run  
✅ Preserves complete folder structure locally  
✅ Skips already downloaded files (resume support)  
✅ Downloads specific file types (configurable)  
✅ Scans subfolders within each parent folder  
✅ Detailed progress logging and statistics  
✅ Error handling with failure tracking  

## Prerequisites

- Node.js (v14 or higher)
- AWS credentials configured (via AWS CLI or environment variables)
- Access permissions to the S3 bucket

## Installation

```bash
npm install
```

## Configuration

Edit the following constants in `s3-downloader.js`:

```javascript
const REGION = 'eu-west-1';              // Your AWS region
const BUCKET_NAME = 'your-bucket-name';  // Your S3 bucket name
const S3_BASE_PREFIX = 'path/to/data/';  // Base path in S3
const DOWNLOAD_DIR = './downloads';      // Local download directory

// Parent folders to scan (add your folder names here)
const MAIN_FOLDERS = [
    'folder1',
    'folder2',
    'folder3',
    // Add more folders as needed
];

// Subfolders to download from each record folder
const FOLDERS_TO_DOWNLOAD = ['videos/', 'photos/'];

// Specific files to download from each record folder
const JSON_FILES_TO_DOWNLOAD = ['form_values.json', 'metadata.json'];
```

### Configuration Examples

**Example 1: Download all media files**
```javascript
const MAIN_FOLDERS = ['projects', 'archives'];
const FOLDERS_TO_DOWNLOAD = ['images/', 'videos/', 'documents/'];
const JSON_FILES_TO_DOWNLOAD = ['metadata.json', 'info.json'];
```

**Example 2: Single folder with specific files**
```javascript
const MAIN_FOLDERS = ['user-uploads'];
const FOLDERS_TO_DOWNLOAD = ['attachments/'];
const JSON_FILES_TO_DOWNLOAD = ['config.json'];
```

## Usage

Run the script:

```bash
node s3-downloader.js
```

Or use npm:

```bash
npm start
```

## How It Works

1. **Scans Parent Folders**: Iterates through each folder in `MAIN_FOLDERS` array
2. **Finds Subfolders**: Lists all subfolders (e.g., record IDs, user IDs) under each parent folder
3. **Downloads Files**: For each subfolder, downloads:
   - Specific files defined in `JSON_FILES_TO_DOWNLOAD`
   - All files in folders defined in `FOLDERS_TO_DOWNLOAD`
4. **Skips Existing Files**: Checks if file exists locally before downloading
5. **Logs Progress**: Shows detailed progress and completion status for each parent folder

## Output Structure

The downloaded files preserve the S3 folder structure:

```
downloads/                          (or your DOWNLOAD_DIR)
├── folder1/                        (MAIN_FOLDERS[0])
│   ├── subfolder-abc-123/          (discovered subfolder)
│   │   ├── metadata.json
│   │   ├── config.json
│   │   ├── videos/
│   │   │   └── video1.mp4
│   │   └── photos/
│   │       └── photo1.jpg
│   └── subfolder-def-456/
│       └── ...
├── folder2/                        (MAIN_FOLDERS[1])
│   └── [subfolders]/
└── folder3/                        (MAIN_FOLDERS[2])
    └── [subfolders]/
```

## Console Output Example

```
Starting S3 download process...

Bucket: your-bucket-name
Main folders to scan: 3

██████████████████████████████████████████████████████████████████████
🗂️  PROCESSING MAIN FOLDER: folder1
██████████████████████████████████████████████████████████████████████

📂 Scanning subfolders...

✓ Found 12 subfolder(s):
  - subfolder-abc-123
  - subfolder-def-456
  - ...

======================================================================
📁 Folder: subfolder-abc-123
======================================================================

  📄 Downloading JSON files...
     • metadata.json
✓ Downloaded: path/to/data/folder1/subfolder-abc-123/metadata.json
     • config.json
⏭️  Skipped (already exists): path/to/data/folder1/subfolder-abc-123/config.json

  📂 Scanning: videos/
  📊 Found 3 file(s)
  [1/3] video1.mp4
✓ Downloaded: path/to/data/folder1/subfolder-abc-123/videos/video1.mp4

▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
✅ folder1 COMPLETED!
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

======================================================================
✅ ALL DOWNLOADS COMPLETED!
======================================================================
📊 Statistics:
   • Main folders processed: 3
   • Record folders scanned: 45
   • Successfully downloaded: 234 file(s)
   • Skipped (already exists): 18 file(s)
   • Failed: 2 file(s)
   • Total: 254 file(s)

📂 Download location: /path/to/your/downloads
======================================================================
```

## AWS Authentication

The script uses AWS SDK's default credential provider chain:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. AWS credentials file (`~/.aws/credentials`)
3. IAM role (if running on EC2)

### Setting up AWS CLI (Recommended)

```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `eu-west-1`)
- Default output format (e.g., `json`)

## Troubleshooting

**Error: "PermanentRedirect"**
- Check that `REGION` matches your bucket's region

**Error: "Access Denied"**
- Verify your AWS credentials have S3 read permissions
- Check bucket name is correct

**Files not downloading**
- Ensure folder names in `MAIN_FOLDERS` match exactly (case-sensitive)
- Check that `S3_BASE_PREFIX` is correct
- Verify subfolder structure matches your expectations

## Notes

- Large files may take time to download
- Script runs synchronously (one file at a time)
- Resume support: Re-run the script to download only missing files
- Failed downloads are logged but don't stop the process

## License

ISC
