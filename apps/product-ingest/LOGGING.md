# Product Ingest Logging

This application uses Winston for comprehensive logging with both console and file outputs.

## Log Configuration

### Log Levels
- **debug**: Detailed diagnostic information (file only)
- **info**: General informational messages (console + file)
- **warn**: Warning messages (console + file)
- **error**: Error messages (console + file)

### Log Transports

#### Console Output
- **Level**: info and above
- **Format**: Colorized, timestamped (HH:mm:ss)
- **Purpose**: Clean, user-friendly progress updates during execution

#### File Output - Daily Rotation
- **Location**: `logs/product-ingest-YYYY-MM-DD.log`
- **Level**: debug and above (all logs)
- **Retention**: 14 days
- **Max Size**: 20MB per file
- **Format**: Detailed with full timestamp and metadata

#### Error File - Daily Rotation
- **Location**: `logs/product-ingest-error-YYYY-MM-DD.log`
- **Level**: error only
- **Retention**: 30 days (longer for troubleshooting)
- **Max Size**: 20MB per file
- **Format**: Detailed with full timestamp and metadata

## Usage

### Running with Logs
```bash
npm run product-ingest:dev
```

Logs will be written to:
- Console: Clean progress updates
- `logs/product-ingest-YYYY-MM-DD.log`: All debug information
- `logs/product-ingest-error-YYYY-MM-DD.log`: Errors only

### Viewing Logs
```bash
# Tail current log file
tail -f logs/product-ingest-$(date +%Y-%m-%d).log

# View errors only
tail -f logs/product-ingest-error-$(date +%Y-%m-%d).log

# Search logs
grep "Processing batch" logs/product-ingest-*.log
```

## Log Content

### Debug Information Includes
- Database connection details
- Batch processing statistics
- Document IDs being processed
- Performance metrics per batch
- Configuration values

### Info Level Includes
- Pipeline progress updates
- Batch completion status
- Total counts and summaries

### Error Level Includes
- Error messages with context
- Stack traces (in file logs)
- Failed batch information

## Log Rotation

Logs are automatically rotated daily:
- Standard logs kept for 14 days
- Error logs kept for 30 days
- Files compressed after rotation
- Old files automatically deleted

## Troubleshooting

If logs are not being created:
1. Ensure `logs/` directory exists
2. Check file permissions
3. Verify Winston configuration in `src/config/winston.config.ts`
4. Check NestJS module imports in `src/app/app.module.ts`
