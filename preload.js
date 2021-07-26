const {ipcRenderer,contextBridge} = require('electron')

contextBridge.exposeInMainWorld('api', {
    performOCR: (image) =>ipcRenderer.invoke('perform-ocr', image),
    getClipboard: () => ipcRenderer.invoke('get-clipboard'),
    registerAwakeCallback: (callback) => {
        ipcRenderer.on('shortcut-awake', (event)=>{
            console.log('Message recieved.')
            callback()
        })
    },
})