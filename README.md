# clipclip_server
nodejs deployment
1. install MongoDb application from https://www.mongodb.com/try/download/community
2. install **iisnode for 7.x (x64) full Setup** for 64 bit system (https://github.com/azure/iisnode/releases/download/v0.2.21/iisnode-full-v0.2.21-x64.msi)
3. download IIS URL rewrite in https://www.iis.net/downloads/microsoft/url-rewrite
4. check whether the module (inside the default website) consist of iisnode
5. add an application pool called iisnode that use of LocalService
6. add a new website and link the directory to nodejs folder
7. copy the webconfig setting from https://tomasz.janczuk.org/2011/08/hosting-express-nodejs-applications-in.html
8. copy all the files from nodejs to the destinated folder
9. start the server and wish for Good Luck~ (https://github.com/Azure/iisnode)

# Switch Development between Production
1. modify the value of mongodb_Uri in config.js if needed
