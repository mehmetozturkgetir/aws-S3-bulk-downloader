const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const REGION = 'eu-west-1';
const BUCKET_NAME = 'warehouse-attachments';
const S3_BASE_PREFIX = 'gis-data/folder/';
const DOWNLOAD_DIR = './downloads';

// Main folders to scan for records
const MAIN_FOLDERS = [
    'folder1',
    'folder2',
    'folder3'
];

// AWS S3 configuration
const s3Client = new S3Client({
    region: REGION,
});

// Subfolders to download from each record folder
const FOLDERS_TO_DOWNLOAD = ['videos/', 'photos/'];

// JSON files to download from each record folder
const JSON_FILES_TO_DOWNLOAD = ['config.json', 'metadata.json'];

/**
 * Lists all folders under the specified prefix
 */
async function listFolders(prefix) {
    const folders = new Set();
    let continuationToken = null;

    do {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
            Delimiter: '/',
            ContinuationToken: continuationToken
        });

        const response = await s3Client.send(command);

        if (response.CommonPrefixes) {
            response.CommonPrefixes.forEach(item => {
                folders.add(item.Prefix);
            });
        }

        continuationToken = response.IsTruncated ? response.NextContinuationToken : null;
    } while (continuationToken);

    return Array.from(folders);
}

/**
 * Lists all files under the specified prefix
 */
async function listAllFiles(prefix) {
    const files = [];
    let continuationToken = null;

    do {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
            ContinuationToken: continuationToken
        });

        const response = await s3Client.send(command);

        if (response.Contents) {
            files.push(...response.Contents.map(item => item.Key));
        }

        continuationToken = response.IsTruncated ? response.NextContinuationToken : null;
    } while (continuationToken);

    return files;
}

/**
 * Downloads a file from S3
 */
async function downloadFile(key, localPath) {
    try {
        // Check if file already exists
        if (fs.existsSync(localPath)) {
            console.log(`⏭️  Skipped (already exists): ${key}`);
            return 'skipped';
        }

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });

        const response = await s3Client.send(command);

        // Create directory if it doesn't exist
        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Download the file
        await pipeline(response.Body, fs.createWriteStream(localPath));
        console.log(`✓ Downloaded: ${key}`);
        return true;
    } catch (error) {
        console.error(`✗ Error (${key}):`, error.message);
        return false;
    }
}

/**
 * Main download function
 */
async function downloadFromS3() {
    console.log('Starting S3 download process...\n');
    console.log(`Bucket: ${BUCKET_NAME}`);
    console.log(`Main folders to scan: ${MAIN_FOLDERS.length}\n`);

    let totalDownloaded = 0;
    let totalFailed = 0;
    let totalFolders = 0;
    let totalRecordFolders = 0;
    let totalSkipped = 0;

    // Process each main folder
    for (const mainFolder of MAIN_FOLDERS) {
        const scanPrefix = S3_BASE_PREFIX + mainFolder + '/';

        console.log('\n' + '█'.repeat(70));
        console.log(`🗂️  PROCESSING MAIN FOLDER: ${mainFolder}`);
        console.log('█'.repeat(70));

        // 1. Find all subfolders (record folders) under current main folder
        console.log('\n📂 Scanning subfolders...\n');
        const subFolders = await listFolders(scanPrefix);

        if (subFolders.length === 0) {
            console.log(`⚠️  No subfolders found in ${mainFolder}`);
            continue;
        }

        console.log(`✓ Found ${subFolders.length} record folder(s):\n`);
        subFolders.forEach(folder => {
            const folderName = folder.replace(scanPrefix, '').replace('/', '');
            console.log(`  - ${folderName}`);
        });
        console.log('');

        // 2. Download JSON files, videos and photos for each subfolder
        for (const subFolder of subFolders) {
            const folderName = subFolder.replace(scanPrefix, '').replace('/', '');
            console.log('\n' + '='.repeat(70));
            console.log(`📁 Folder: ${folderName}`);
            console.log('='.repeat(70));

            totalRecordFolders++;

            // Download JSON files
            console.log(`\n  📄 Downloading JSON files...`);
            for (const jsonFile of JSON_FILES_TO_DOWNLOAD) {
                const fileKey = subFolder + jsonFile;
                const relativePath = fileKey.replace(S3_BASE_PREFIX, '');
                const localPath = path.join(DOWNLOAD_DIR, relativePath);

                console.log(`     • ${jsonFile}`);

                const success = await downloadFile(fileKey, localPath);
                if (success === true) {
                    totalDownloaded++;
                } else if (success === 'skipped') {
                    totalSkipped++;
                } else {
                    totalFailed++;
                }
            }

            // Download videos and photos folders
            for (const targetFolder of FOLDERS_TO_DOWNLOAD) {
                const fullPrefix = subFolder + targetFolder;
                console.log(`\n  📂 Scanning: ${targetFolder}`);

                // List files
                const files = await listAllFiles(fullPrefix);

                // Filter folder entries (get only files)
                const actualFiles = files.filter(key => !key.endsWith('/'));

                if (actualFiles.length === 0) {
                    console.log(`  ℹ️  No files found`);
                    continue;
                }

                console.log(`  📊 Found ${actualFiles.length} file(s)`);

                // Download each file
                for (let i = 0; i < actualFiles.length; i++) {
                    const fileKey = actualFiles[i];
                    // Get path after S3_BASE_PREFIX (fulcrum/aday_depolar_türkiye/...)
                    const relativePath = fileKey.replace(S3_BASE_PREFIX, '');
                    const localPath = path.join(DOWNLOAD_DIR, relativePath);

                    console.log(`  [${i + 1}/${actualFiles.length}] ${path.basename(fileKey)}`);

                    const success = await downloadFile(fileKey, localPath);
                    if (success === true) {
                        totalDownloaded++;
                    } else if (success === 'skipped') {
                        totalSkipped++;
                    } else {
                        totalFailed++;
                    }
                }
            }
        }

        totalFolders++;
        console.log('\n' + '▓'.repeat(70));
        console.log(`✅ ${mainFolder} COMPLETED!`);
        console.log('▓'.repeat(70));
    }

    console.log('\n\n' + '='.repeat(70));
    console.log('✅ ALL DOWNLOADS COMPLETED!');
    console.log('='.repeat(70));
    console.log(`📊 Statistics:`);
    console.log(`   • Main folders processed: ${totalFolders}`);
    console.log(`   • Record folders scanned: ${totalRecordFolders}`);
    console.log(`   • Successfully downloaded: ${totalDownloaded} file(s)`);
    console.log(`   • Skipped (already exists): ${totalSkipped} file(s)`);
    console.log(`   • Failed: ${totalFailed} file(s)`);
    console.log(`   • Total: ${totalDownloaded + totalSkipped + totalFailed} file(s)`);
    console.log(`\n📂 Download location: ${path.resolve(DOWNLOAD_DIR)}`);
    console.log('='.repeat(70));
}

// Run the script
downloadFromS3().catch(error => {
    console.error('Critical error:', error);
    process.exit(1);
});
