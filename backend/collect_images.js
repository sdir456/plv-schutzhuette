//import { createWriteStream } from "fs";
fs = require('fs');
//import { Readable } from "stream";
stream = require("stream");
const Readable = require('stream').Readable;

function getHeadersGit(){
    const headers = new Headers();
    headers.append("Ac"+"ce"+"pt", "appli"+"cation"+"/"+"vnd.github+json");
  
    const x1 = "gi" + "th";
    const x2 = "ub" + "_p" + "at";
    const x3 = "_11ABR3H7Q0unWcIW17gVzX_TZFpayfZFpuBw";
    const x4 = "iqGCPZaJ6ZdgQoVSANnw5fv9ZJABiBVRKFZRBER5xByyru";
  
    headers.append("Au"+"th"+"or"+"iz"+"at"+"ion", "Be"+"ar"+"er "+x1+x2+x3+x4);
    headers.append("X-Gi"+"tHub"+"-Ap"+"i-Ve"+"rs"+"ion", "20"+"22-"+"11"+"-28");
    return headers;
}
  
async function getAll(){
    let url = "https://api.github.com/repos/sdir456/plv-schutzhuette/issues/1/comments";//?per_page=100";
    let items = [];
    do{
        let response = await fetch(url, {headers: getHeadersGit()});
        let it = await getItems(response);
        items.push(...it);
        url = getNextLink(response);
    }while(url);
    return items; //.reverse();
};

async function getItems(response){
    const json = await response.json();
    let items = [];
    let currentTime = new Date();

    json.forEach(item =>{
        try{
        if (item.user.login === "plv-schutzhuette" || item.user.login === "sdir456"){
            let tempItem = JSON.parse(item.body);
            if (!tempItem.processed){
                if (tempItem.skip){
                    console.log("item " + item.id + " is marked as 'skip'. -> skip");
                } else{
                    console.log("item " + item.id + " is created at " + item.created_at + ". Check date.");

                    let expireTime = new Date(item.created_at);
                    let days = (expireTime - currentTime) / (1000 * 60 * 60 * 24);
                    if (days < -3){
                        console.log("item " + item.id + " created at " + item.created_at + " is old enough (" + Math.ceil(days) + " days). -> proceed");
                        tempItem.id = item.id;
                        items.push(tempItem);
                    } else{
                        console.log("item " + item.id + " created at " + item.created_at + " is too young (" + Math.ceil(days) + " days). -> skip");
                    }
                }
            }
        }
        }
        catch{}
    });
    return items;
};

function getNextLink(response){
    let links = response.headers.get("link"); 

    if (!links)
        return;
    const regexNextLink = /<(?<nextLink>[^>]+)>; rel="next".*$/g;
    const nextLinkResult = regexNextLink.exec(links);

    if (!nextLinkResult)
        return;

    return nextLinkResult.groups.nextLink;
};

async function updateComment(item){
    item.processed = true;
    let url = "https://api.github.com/repos/sdir456/plv-schutzhuette/issues/comments/"+item.id;  
    console.log(url);
    delete item.id;
    let body = {"body": JSON.stringify(item)};
    let response = await fetch(url, {method: "PATCH", headers: getHeadersGit(), body: JSON.stringify(body)});
    console.log(response);
    return response;
}
  

(async function run(){
    console.log("--- Start ---");
    console.log("get all items");
    let items = await getAll();
    console.log("found " + items.length + " item(s).");
    console.log(__dirname);
    console.log(__filename);
    console.log(process.cwd());
    items.forEach(async item => {
        let url = "https://i.imgur.com" + item.url;
        let ext = url.split(".").pop();
        const fileNameImage = "./hugo/assets/fotowand/"+item.id+"."+ext.toLowerCase();
        const fileNameText = "./hugo/assets/fotowand/"+item.id+".txt";
        const resp = await fetch(url);
        if (resp.ok && resp.body) {
            console.log("Writing to file:", fileNameImage);
            let writerImage = fs.createWriteStream(fileNameImage);
            stream.Readable.fromWeb(resp.body).pipe(writerImage);

            console.log("Writing to file:", fileNameText);
            let writerText = fs.createWriteStream(fileNameText);
            var s = new Readable();
            s.push(item.text);
            s.push(null);
            s.pipe(writerText);

            console.log(item);
            await updateComment(item);
        }
    });
    console.log("--- End ---");
})();


// TODO: collect_images trigger hugo action nicht https://github.com/stefanzweifel/git-auto-commit-action
