# Scheduling Live Stream Metrics Collection

This guide provides detailed instructions for setting up automated data collection for live stream metrics.

## Prerequisites

- Database initialized (`npm run init-db` or `npm run create-db`)
- At least one active channel added (use `npm run manage-channels add @channelhandle`)
- YouTube API key configured in `.env` file

## Quick Start

### Test Manual Collection

Before setting up automation, test manual collection:

```bash
# Test with dry run
npm run collect-metrics -- --dry-run

# Run actual collection for yesterday
npm run collect-metrics
```

## Linux/Unix/macOS Scheduling

### Using Cron

Cron is the standard scheduling tool on Unix-based systems.

#### 1. Edit your crontab

```bash
crontab -e
```

#### 2. Add collection jobs

**Daily collection at 2 AM:**
```cron
0 2 * * * cd /path/to/promo-indicator && /usr/bin/npm run collect-metrics >> /var/log/livestream-collection.log 2>&1
```

**Daily collection with date rotation (keep 30 days of logs):**
```cron
0 2 * * * cd /path/to/promo-indicator && /usr/bin/npm run collect-metrics >> /var/log/livestream-$(date +\%Y-\%m-\%d).log 2>&1
```

**Weekly backfill (runs every Monday at 3 AM):**
```cron
0 3 * * 1 cd /path/to/promo-indicator && /usr/bin/npm run collect-metrics -- --start-date $(date -d '7 days ago' +\%Y-\%m-\%d) --end-date $(date -d '1 day ago' +\%Y-\%m-\%d) >> /var/log/livestream-weekly.log 2>&1
```

**Multiple daily collections:**
```cron
# Morning collection
0 2 * * * cd /path/to/promo-indicator && /usr/bin/npm run collect-metrics >> /var/log/livestream.log 2>&1

# Evening collection for current day
0 22 * * * cd /path/to/promo-indicator && /usr/bin/npm run collect-metrics -- --start-date $(date +\%Y-\%m-\%d) >> /var/log/livestream-today.log 2>&1
```

#### 3. Verify cron jobs

List your cron jobs:
```bash
crontab -l
```

Check cron logs:
```bash
# Ubuntu/Debian
grep CRON /var/log/syslog

# CentOS/RHEL
grep CRON /var/log/cron

# macOS
log show --predicate 'process == "cron"' --last 1h
```

### Using systemd (Linux)

Systemd timers are a modern alternative to cron on Linux systems.

#### 1. Create service file

Create `/etc/systemd/system/livestream-collector.service`:

```ini
[Unit]
Description=Live Stream Metrics Collection
After=network.target

[Service]
Type=oneshot
User=yourusername
WorkingDirectory=/path/to/promo-indicator
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm run collect-metrics
StandardOutput=append:/var/log/livestream-collector.log
StandardError=append:/var/log/livestream-collector.log

[Install]
WantedBy=multi-user.target
```

#### 2. Create timer file

Create `/etc/systemd/system/livestream-collector.timer`:

```ini
[Unit]
Description=Daily Live Stream Metrics Collection
Requires=livestream-collector.service

[Timer]
OnCalendar=daily
OnCalendar=*-*-* 02:00:00
Persistent=true
AccuracySec=1min

[Install]
WantedBy=timers.target
```

#### 3. Enable and start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable timer to start on boot
sudo systemctl enable livestream-collector.timer

# Start timer now
sudo systemctl start livestream-collector.timer

# Check status
sudo systemctl status livestream-collector.timer

# View upcoming runs
systemctl list-timers livestream-collector.timer
```

#### 4. Manual execution

Run the service manually for testing:
```bash
sudo systemctl start livestream-collector.service
```

#### 5. View logs

```bash
# Service logs
sudo journalctl -u livestream-collector.service

# Follow logs in real-time
sudo journalctl -u livestream-collector.service -f

# Logs from today
sudo journalctl -u livestream-collector.service --since today
```

## Windows Scheduling

### Using Task Scheduler

#### 1. Open Task Scheduler

- Press `Win + R`, type `taskschd.msc`, and press Enter
- Or search for "Task Scheduler" in the Start menu

#### 2. Create Basic Task

1. Click "Create Basic Task" in the right panel
2. Name: "Live Stream Metrics Collection"
3. Description: "Daily collection of YouTube live stream metrics"
4. Trigger: "Daily"
5. Start date and time: Choose your preferred time (e.g., 2:00 AM)
6. Action: "Start a program"

#### 3. Configure Program

**Program/script:**
```
cmd.exe
```

**Arguments:**
```
/c cd /d "C:\path\to\promo-indicator" && npm run collect-metrics >> logs\collection.log 2>&1
```

Or use Node.js directly:
```
/c cd /d "C:\path\to\promo-indicator" && node src\scripts\collectLiveStreamMetrics.js >> logs\collection.log 2>&1
```

#### 4. Advanced Settings (Optional)

1. Right-click the created task and select "Properties"
2. **General tab:**
   - Check "Run whether user is logged on or not"
   - Check "Run with highest privileges" (if needed)
3. **Settings tab:**
   - Check "Allow task to be run on demand"
   - Check "Stop the task if it runs longer than: 1 hour"
   - Check "If the task fails, restart every: 10 minutes"

#### 5. Create Log Directory

```cmd
mkdir C:\path\to\promo-indicator\logs
```

### Using PowerShell Script

Create `scripts/collect-metrics.ps1`:

```powershell
# Navigate to project directory
Set-Location -Path "C:\path\to\promo-indicator"

# Set log file with date
$logFile = "logs\collection-$(Get-Date -Format 'yyyy-MM-dd').log"

# Run collection
npm run collect-metrics *>&1 | Tee-Object -FilePath $logFile -Append
```

Schedule this PowerShell script in Task Scheduler:
- **Program/script:** `powershell.exe`
- **Arguments:** `-ExecutionPolicy Bypass -File "C:\path\to\promo-indicator\scripts\collect-metrics.ps1"`

## Docker/Container Environments

### Docker Compose with Cron

Add a cron service to `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./database:/app/database
    environment:
      - YOUTUBE_API_KEY=${YOUTUBE_API_KEY}

  collector:
    build: .
    volumes:
      - ./database:/app/database
    environment:
      - YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
    command: >
      sh -c "echo '0 2 * * * cd /app && npm run collect-metrics >> /var/log/collector.log 2>&1' | crontab - && crond -f -l 2"
```

### Kubernetes CronJob

Create `k8s/livestream-collector-cronjob.yaml`:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: livestream-collector
  namespace: promo-indicator
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: collector
            image: promo-indicator:latest
            imagePullPolicy: Always
            command: ["npm", "run", "collect-metrics"]
            env:
            - name: YOUTUBE_API_KEY
              valueFrom:
                secretKeyRef:
                  name: youtube-api-secret
                  key: api-key
            - name: NODE_ENV
              value: "production"
            volumeMounts:
            - name: database
              mountPath: /app/database
          volumes:
          - name: database
            persistentVolumeClaim:
              claimName: promo-indicator-db-pvc
```

Deploy:
```bash
kubectl apply -f k8s/livestream-collector-cronjob.yaml
```

Monitor:
```bash
# List cron jobs
kubectl get cronjobs -n promo-indicator

# View job history
kubectl get jobs -n promo-indicator

# View logs
kubectl logs -n promo-indicator job/livestream-collector-<job-id>
```

## Cloud Platform Scheduling

### AWS EventBridge (CloudWatch Events)

1. Create Lambda function or ECS Task
2. Configure EventBridge rule:
   - Schedule: `cron(0 2 * * ? *)`
   - Target: Your Lambda function or ECS Task

### Google Cloud Scheduler

```bash
gcloud scheduler jobs create http livestream-collector \
  --schedule="0 2 * * *" \
  --uri="https://your-service-url/collect-metrics" \
  --http-method=POST \
  --time-zone="America/New_York"
```

### Azure Logic Apps

1. Create Logic App
2. Add Recurrence trigger (daily at 2 AM)
3. Add HTTP action to trigger your collection endpoint

## Monitoring and Maintenance

### Log Rotation

#### Linux (logrotate)

Create `/etc/logrotate.d/livestream-collector`:

```
/var/log/livestream-*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 yourusername yourusername
}
```

Test:
```bash
sudo logrotate -d /etc/logrotate.d/livestream-collector
```

### Email Notifications

#### Linux with mail

Modify cron job:
```cron
0 2 * * * cd /path/to/promo-indicator && /usr/bin/npm run collect-metrics 2>&1 | mail -s "LiveStream Collection Report" you@example.com
```

#### Custom notification script

Create `scripts/collect-and-notify.sh`:

```bash
#!/bin/bash
cd /path/to/promo-indicator

LOG_FILE="/tmp/collection-$(date +%Y-%m-%d).log"
npm run collect-metrics > "$LOG_FILE" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    # Send failure notification
    mail -s "FAILED: LiveStream Collection" you@example.com < "$LOG_FILE"
else
    # Optional: Send success notification with summary
    SUMMARY=$(tail -n 10 "$LOG_FILE")
    echo "$SUMMARY" | mail -s "SUCCESS: LiveStream Collection" you@example.com
fi

exit $EXIT_CODE
```

Schedule:
```cron
0 2 * * * /path/to/promo-indicator/scripts/collect-and-notify.sh
```

### Health Checks

Create monitoring script `scripts/check-collection.sh`:

```bash
#!/bin/bash
DB_PATH="/path/to/promo-indicator/database/promo-indicator.db"
YESTERDAY=$(date -d '1 day ago' +%Y-%m-%d)

# Check if data was collected yesterday
COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM live_stream_metrics WHERE date='$YESTERDAY'")

if [ "$COUNT" -eq 0 ]; then
    echo "WARNING: No metrics collected for $YESTERDAY"
    exit 1
else
    echo "OK: Found $COUNT channel metrics for $YESTERDAY"
    exit 0
fi
```

## Troubleshooting

### Common Issues

#### Cron job not running
1. Check cron service: `sudo systemctl status cron`
2. Verify PATH in crontab:
   ```cron
   PATH=/usr/local/bin:/usr/bin:/bin
   0 2 * * * cd /path/to/promo-indicator && npm run collect-metrics
   ```

#### Permission errors
- Ensure the user has read/write access to the database directory
- Check log file permissions

#### API quota exceeded
- Spread collections throughout the day
- Reduce the number of channels
- Increase time between collections

#### Database locked
- Ensure only one collection runs at a time
- Use cron's `flock` to prevent overlapping:
  ```cron
  0 2 * * * flock -n /tmp/collect.lock -c 'cd /path/to/promo-indicator && npm run collect-metrics'
  ```

### Testing Scheduled Jobs

Test without waiting for schedule:

**Cron:**
```bash
# Run the exact command from crontab
cd /path/to/promo-indicator && npm run collect-metrics
```

**Systemd:**
```bash
sudo systemctl start livestream-collector.service
sudo journalctl -u livestream-collector.service -f
```

**Windows:**
- Right-click task in Task Scheduler
- Select "Run"
- Check logs directory

## Best Practices

1. **Start with dry runs** - Test with `--dry-run` first
2. **Monitor logs** - Keep at least 30 days of logs
3. **Set up alerts** - Get notified of failures
4. **Backup database** - Regular backups before collection
5. **Stagger schedules** - Don't run all tasks at the same time
6. **Rate limiting** - Be mindful of YouTube API quotas
7. **Error handling** - Review and fix failed collections promptly
8. **Test recovery** - Verify backfill works for missed days

## Example Complete Setup

Daily collection with monitoring:

```bash
#!/bin/bash
# /usr/local/bin/livestream-collect.sh

set -e

PROJECT_DIR="/opt/promo-indicator"
LOG_DIR="$PROJECT_DIR/logs"
DB_DIR="$PROJECT_DIR/database"
DATE=$(date +%Y-%m-%d)

# Create directories if they don't exist
mkdir -p "$LOG_DIR" "$DB_DIR"

# Backup database before collection
cp "$DB_DIR/promo-indicator.db" "$DB_DIR/promo-indicator.db.backup-$DATE"

# Run collection
cd "$PROJECT_DIR"
npm run collect-metrics >> "$LOG_DIR/collection-$DATE.log" 2>&1
EXIT_CODE=$?

# Check result
if [ $EXIT_CODE -eq 0 ]; then
    echo "Collection completed successfully at $(date)" >> "$LOG_DIR/success.log"
    # Clean old backups (keep 7 days)
    find "$DB_DIR" -name "*.backup-*" -mtime +7 -delete
else
    echo "Collection failed at $(date)" >> "$LOG_DIR/errors.log"
    # Send alert
    mail -s "ALERT: LiveStream Collection Failed" admin@example.com < "$LOG_DIR/collection-$DATE.log"
fi

# Clean old logs (keep 30 days)
find "$LOG_DIR" -name "collection-*.log" -mtime +30 -delete

exit $EXIT_CODE
```

Make executable and schedule:
```bash
chmod +x /usr/local/bin/livestream-collect.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /usr/local/bin/livestream-collect.sh
```

## Support

For issues with scheduling:
1. Check system logs
2. Verify file permissions
3. Test manual execution
4. Review error logs
5. Open an issue on GitHub with logs
