# PM2 Process Manager - Quick Reference

Your Fashionitas app is now running 24/7 with PM2! It will automatically restart if it crashes and will keep running even when you close VS Code.

## App Status
- **App Name**: fashionitas-app
- **Local URL**: http://localhost:3000
- **Public URL**: https://contributor-sampling-controversial-football.trycloudflare.com
- **Current Status**: ✅ Online & Public

## Running Services
1. **fashionitas-app** - Your Node.js application
2. **public-tunnel** - Cloudflare Tunnel (makes your app public)

## Essential Commands

### View App Status
```bash
pm2 status
```

### View Real-Time Logs
```bash
pm2 logs fashionitas-app
```

### View Last 100 Lines of Logs
```bash
pm2 logs fashionitas-app --lines 100
```

### Stop the App
```bash
pm2 stop fashionitas-app
```

### Start the App (if stopped)
```bash
pm2 start fashionitas-app
```

### Restart the App (to apply code changes)
```bash
pm2 restart fashionitas-app
```

### View Resource Usage (CPU/Memory)
```bash
pm2 monit
```

### Delete the App from PM2
```bash
pm2 delete fashionitas-app
```

### View Detailed App Info
```bash
pm2 show fashionitas-app
```

## After Code Changes

When you modify your code, restart the app to apply changes:
```bash
pm2 restart fashionitas-app
```

## Troubleshooting

### App Not Running?
```bash
pm2 status
pm2 restart fashionitas-app
```

### Check for Errors
```bash
pm2 logs fashionitas-app --err
```

### Clear All Logs
```bash
pm2 flush
```

## Important Notes

✅ **PM2 keeps running** - Your app continues running even if you:
  - Close VS Code
  - Close your browser
  - Disconnect from the dev container

✅ **Auto-restart** - If the app crashes, PM2 automatically restarts it

✅ **Persistent** - PM2 configuration is saved and will restore your app if the container restarts

⚠️ **Dev Container Limitation** - In this dev container environment, PM2 won't auto-start on system boot, but it will keep your app running continuously while the container is active.

## How to Stop PM2 Completely

If you want to stop everything:
```bash
pm2 kill
```

This will stop the PM2 daemon and all managed processes.
