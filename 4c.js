var request = require('request');
var wget = require('wget-improved');
var ProgressBar = require('progress');

var async = require('async');
var fs = require('fs');
var curDir = __dirname

var board = process.argv[2];
board = board.toString();

var conns = process.argv[3] || 1;
var pageCount =  process.argv[4] || 10;
var dir = "/"+ process.argv[5] || "/pics";

console.log("dir --", dir)

var downloadList = []
var path = curDir + dir

if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
}
var getBoardCatalog = function (done) {
    console.log("getting catalog")
    request("https://a.4cdn.org/" + board + "/catalog.json", function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var catalog = JSON.parse(body);
            done(null, catalog)
        } else {
            done(error)
            console.log("error fetching catalog---- ", error)
        }
    })
}

var getThreadPics2 = function (board, threadNo, done) {
    console.log(board, threadNo)
    // var date = new Date();
    var path = curDir + "/pics666/"
    if (!fs.existsSync(path)) { // create thread dir
        fs.mkdirSync(path);
    }
    var url = "https://a.4cdn.org/" + board + "/thread/" + threadNo + ".json";
    //console.log("my url--", url, path);
    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var count = 0, count2 = 0;
            var posts = JSON.parse(body).posts;
            // for (index = 0; index < posts.length; index++) {
            var index = 0;
            async.eachSeries(posts, function (posta, callback) {
                if (typeof posts[index].tim != 'undefined') {
                    count++;
                    var link = "https://i.4cdn.org/" + board + "/" + posts[index].tim + posts[index].ext
                    var filename = posts[index].tim + posts[index].ext
                    if (!fs.existsSync(path + "/" + threadNo)) { // create thread dir
                        fs.mkdirSync(path + "/" + threadNo);
                    }

                    request(link).pipe(fs.createWriteStream(path + "/" + threadNo + "/" + filename))
                        .on('open', function () {
                            counter = 0;
                            console.log("download started", filename);
                        })
                        .on('close', function () {
                            count2++; //TODO: count also if error happens
                            console.log("download finished", count2 + " / " + count);
                            if (count > 5 && count2 == 5) callback();
                            else if (count <= 5)  callback();

                            if (count2 >= count) {
                                console.log("total downloaded: ", count2);
                                done();
                            }
                        });

                }
                index++;
            })

            //}
        } else {
            console.log("seacon----", error)
        }
    })
}

var getThreadPics = function (board, threadNo, done) {
    var url = "https://a.4cdn.org/" + board + "/thread/" + threadNo + ".json";
    console.log("Fetching thread --", url)
    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var count = 0, count2 = 0;
            var posts = JSON.parse(body).posts;

            for (index = 0; index < posts.length; index++) {
                if (typeof posts[index].tim != 'undefined') {
                    count++;
                    var link = "https://i.4cdn.org/" + board + "/" + posts[index].tim + posts[index].ext
                    var filename = posts[index].tim + posts[index].ext
                    if (!fs.existsSync(path + "/" + threadNo)) { // create thread dir
                        fs.mkdirSync(path + "/" + threadNo);
                    }
                    var linkObject = {
                        link: link,
                        filename: filename,
                        threadNo: threadNo
                    }
                    downloadList[downloadList.length] = linkObject;
                    if(posts.length == index+1) done();
                }else{
                    if(posts.length == index+1) done();
                }
            }
        } else {
            console.log("Error Fetching ----", url, error)
            done();
        }
    })
}

var downloadFilesWGet = function(url, filename, done){
  console.log("please wait ...",url)
        var options2 = {
        //see options below
        };
        var count = 1;
        async.eachSeries(downloadList, function (link, callback) {

            if (!fs.existsSync(path)) { // create thread dir
                fs.mkdirSync(path);
            }
            var tempLinks = []
            tempLinks = downloadList.splice(0, conns);
            if(!tempLinks || tempLinks.length == 0) callback()
            tempLinks.forEach(function (link, index) {
                var download = wget.download(link.link, path + "/" + link.threadNo + "/" + link.filename, options2);
                download.on('error', function(err) {
                     console.log('error downloading');
                     if(tempLinks.length == index+1) callback();
                });
                download.on('start', function(fileSize) {
                    console.log("downloading started ..", link.link, fileSize)
                });

                download.on('end', function(output) {
                    console.log("downloading finished ..", count, "/", downloadList.length, "\n")
                    count++;
                    if(tempLinks.length == index+1) callback();
                });

                var bar = new ProgressBar('  downloading [:bar] :percent :etas', {
                           complete: '=',
                           incomplete: ' ',
                           width: 40,
                           total: 100
                         });
                download.on('progress', function(progress) {
                   bar.tick(Math.floor(progress*100));
                });
            })

        }, function (err) {
            console.log("i am done")
        })


}

var downloadFiles = function () {
    var count = 1;
    async.eachSeries(downloadList, function (link, callback) {
        if (!fs.existsSync(path)) { // create thread dir
            fs.mkdirSync(path);
        }
        var tempLinks = []
        tempLinks = downloadList.splice(0, conns);
        if(!tempLinks || tempLinks.length == 0) callback()
        tempLinks.forEach(function (link, index) {
            request(link.link).pipe(fs.createWriteStream(path + "/" + link.threadNo + "/" + link.filename)).on('close', function () {
                console.log("downloading finished ..", count, "/", downloadList.length)
                count++;
                console.log(tempLinks.length, index)
                if(tempLinks.length == index+1) callback();
            });
        })

    }, function (err) {
        console.log("i am done")
    })
}

if(board == "--help"){
    console.log(" 4C DOWNLOADER USAGE" +
        "\n\n node 4c.js <board> <download speed [1-10]> <page count [1-10]> [dir-name]" +
        "\n\n [dir-name] - Download Destination Folder" +
        "\n\n <page count> - No of pages to download  default 10" +
        "\n\n <download speed [1-10]> - download speed  default 1" +
        "\n\n Example: node 4c.js b 5 2 (downloads 2 pages of board \"random(b)\" with a speed of 5)" +
        "\n\n Author: B3rew"
    )
}
else{
    getBoardCatalog(function (err, list) {
        var count = 1;
        if (!err) console.log("catalog fetched ...")
        async.eachSeries(list, function (page, callback) {
            console.log("fetching threads ...")
            console.log("page --------------, ", page.page);
            if(count <= pageCount){
              count++;
              async.eachSeries(page.threads, function (thread, callmeback) {
                  // console.log("thread----, ", thread.no);
                  getThreadPics(board, thread.no, function () {
                      // console.log("thread.no, ", thread.no);
                      callmeback();
                  })
              }, function (err) {
                  callback();
              })
            }else {
              count++;
              callback();
            }


        }, function (err) {
            downloadFiles();
            // downloadFilesWGet()
        })
    })
}
