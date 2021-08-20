const { app, BrowserWindow, ipcMain, clipboard, globalShortcut, screen, ipcRenderer } = require('electron')
const path = require('path')
const { execSync } = require('child_process')
const { createWorker, } = require('tesseract.js')

let window;

const worker = createWorker({
    cachePath: path.join(__dirname, 'lang-data'),
    logger: m => {
        // performs status update to the ipc renderer.
        console.log(m)
        window.webContents.send('dashboard-update', m)
    }
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
        icon: path.join(__dirname, 'icon.icns'),
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

function isChineseCharacter(value) {
    return /[^\x00-\xff]+$/i.test(value)
}
function isSymbolWithLatterSpace(value) {
    return /[.;?!,]+/i.test(value)
}
function filterText(r) {
    let filtered = ''
    for (let i = 0; i < r.length; i++) {
        if (i > 0 && i < r.length - 1) {
            if (r[i] === ' ' && isChineseCharacter(r[i - 1]) && isChineseCharacter(r[i + 1])) continue
            if (r[i] === ' ' && isSymbolWithLatterSpace(r[i + 1])) continue
            if (isSymbolWithLatterSpace(r[i]) && r[i + 1] !== ' ') {
                filtered += r[i] + ' '
                continue
            }
        }
        filtered += r[i]
    }
    return filtered
}

ipcMain.handle('cap-n-ocr', async (event) => {
    try {
        execSync('screencapture -i -s -c')

        console.log('Image recving.')
        let imageObject = clipboard.readImage()
        console.log('Image recvd, resizing.')

        let scaledImageObject = imageObject.resize({
            width: imageObject.width * 2
        })
        console.log('Image resized; encoding...')
        let image = scaledImageObject.toDataURL()
        console.log('Encoded; Performing OCR...')
        window.webContents.send('dashboard-update', { status: 'Decoding... (this might take a while)', unsure: true})
        const { data: { text } } = await worker.recognize(image);
        console.log('Done.')

        let result = filterText(text)
        console.log(result)
        clipboard.writeText(result)
        return result
    } catch (e) {
        console.log(e)
        // probably because the user has canceled the operation.
        // destroy the window and ignore.
        window.close()
    }

    
    
})

app.whenReady().then(() => { // make sure the panel is ready for worker to sync status. 
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
    

}).then(async () => {
    window.webContents.send('dashboard-update', { status: 'initializing.', unsure: true})
    await worker.load();
    await worker.loadLanguage('eng+tha+chi_sim+chi_sim_vert+equ');
    await worker.initialize('eng+tha+chi_sim+chi_sim_vert+equ');
    globalShortcut.register('Option+Shift+S', () => {
        // activate from sleep
        if (window !== null) window.close()
        createWindow()
        window.webContents.send('shortcut-awake')
    })
})


