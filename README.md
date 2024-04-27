# clipclip_server
nodejs deployment
1. install **iisnode for 7.x (x64) full Setup** for 64 bit system (https://github.com/azure/iisnode/releases/download/v0.2.21/iisnode-full-v0.2.21-x64.msi)
2. download IIS URL rewrite in https://www.iis.net/downloads/microsoft/url-rewrite
3. check whether the module (inside the default website) consist of iisnode
4. add an application pool called iisnode that use of LocalService
5. add a new website and link the directory to nodejs folder
6. copy the webconfig setting from https://tomasz.janczuk.org/2011/08/hosting-express-nodejs-applications-in.html
7. copy all the files from nodejs to the destinated folder
8. start the server and wish for Good Luck~

# Switch Development between Production
1. modify the value of mongodb_Uri in config.js if needed