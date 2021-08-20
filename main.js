const { app, BrowserWindow, ipcMain, clipboard, globalShortcut, screen } = require('electron')
const path = require('path')
const {execSync} = require('child_process')
const {createWorker,} = require('tesseract.js')

let window;

const worker = createWorker({
    cachePath: path.join(__dirname, 'lang-data'),
    logger: m => console.log(m)
  });

function createWindow() {
    window = new BrowserWindow({

        width: 400,
        height: 400,
        x: 2800,
        y: 64,
        frame: true,
        hasShadow: true,
        alwaysOnTop: true,
        icon: path.join(__dirname, 'stickyOCR.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })
    
    window.loadFile('index.html')

    if (process.env.NODE_ENV === 'debug') window.webContents.openDevTools()
    window.on('close', () => {
        window = null;
    })
}

ipcMain.handle('perform-ocr', async (event, image) => {
    const { data: { text } } = await worker.recognize(image);
    clipboard.writeText(text)
    return text
})

ipcMain.handle('get-clipboard', async () => {
    execSync('screencapture -i -s -c')
    let imageObject = clipboard.readImage()
    let scaledImageObject = imageObject.resize({
        width: imageObject.width * 2
    })
    //console.log(imageObject.toDataURL())
    return scaledImageObject.toDataURL()
})

app.whenReady().then(async() => {

    await worker.load();
    await worker.loadLanguage('eng+tha+chi_sim+chi_sim_vert+equ');
    await worker.initialize('eng+tha+chi_sim+chi_sim_vert+equ');
    globalShortcut.register('Option+Shift+S', ()=>{
        // activate from sleep
        if(window !== null) window.close()
        createWindow()
        window.webContents.send('shortcut-awake')
    })
}).then(() => {
    createWindow()
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit()
        }
    })
    app.on('activate', () => {
        if (window === null) {
            createWindow()
        }
    })

})


