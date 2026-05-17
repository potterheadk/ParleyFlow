const { app, BrowserWindow } = require('electron');
const path = require('path');

// Read the flag passed from package.json "electron:dev" script
const isDev = process.argv.includes('--dev');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        },
    });

    if (isDev) {
        // In dev mode, connect directly to Vite server
        mainWindow.loadURL('http://localhost:5173');
    } else {
        // In production mode, load the bundled files
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    // Quit when all windows are closed, except on macOS
    if (process.platform !== 'darwin') app.quit();
});