const { ipcRenderer, contextBridge } = require('electron')

contextBridge.exposeInMainWorld('api', {
    capNOCR: async (callback) => {
        callback(await ipcRenderer.invoke('cap-n-ocr'))
    },
    registerAwakeCallback: (callback) => {
        ipcRenderer.on('shortcut-awake', (event) => {
            console.log('Message recieved.')
            callback()
        })
    },
    setDashboardCallback: (callback) => {
        ipcRenderer.on('dashboard-update', (event, messageObject) => {
            callback(messageObject)
        })
    }
})