# clipclip_server
nodejs deployment
1. install nodejs
2. install MongoDb application from https://www.mongodb.com/try/download/community
3. install **iisnode for 7.x (x64) full Setup** for 64 bit system (https://github.com/azure/iisnode/releases/download/v0.2.21/iisnode-full-v0.2.21-x64.msi)
4. download IIS URL rewrite in https://www.iis.net/downloads/microsoft/url-rewrite
5. check whether the module (inside the default website) consist of iisnode
6. add an application pool called iisnode that use of **LocalSystem** (dun know why)
7. add a new website and link the directory to nodejs folder
8. copy the webconfig setting from https://tomasz.janczuk.org/2011/08/hosting-express-nodejs-applications-in.html
9. copy all the files from nodejs to the destinated folder
10. start the server and wish for Good Luck~ (https://github.com/Azure/iisnode)


# Switch Development between Production
1. modify the value of mongodb_Uri in config.js if needed
2. run "npm install" in terminal
3. since window server usually has websocket installed and no path to the node.exe, add these two line inside 
   (https://tomasz.janczuk.org/2012/11/how-to-use-websockets-with-nodejs-apps.html)
   (https://stackoverflow.com/questions/50244164/iisnode-module-is-unable-to-start-the-node-exe-process)
```yml
<system.webServer>
    <iisnode nodeProcessCommandLine="C:\Program Files\nodejs\node.exe" />
    <webSocket enabled="false" />
</system.webServer>
```
