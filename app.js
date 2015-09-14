var express = require('express'),
    path = require('path'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    request = require('request'),
    async = require('async'),
    fs = require('fs');
var lineReader = require('line-reader');
var multer = require('multer');
var upload = multer({ dest: './uploads/' });

var app = express();
//app.use(upload);
//var io = require('socket.io')(app);
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true }));
//app.use(bodyParser({uploadDir:'./uploads'}));

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
    res.render('index.html');
});

app.get('/health', function(req, res) {
    res.json({
        status: 'healthy'
    });
});
var categories = {};
var testArray = {};
var individualItemCategory=[];
var progressCount = new Array();
var failedRows = 0;
var callback;
var runonce = true, runonce2 = true;
var nextTick = process.nextTick;

process.nextTick = function(callback) {
    if (typeof callback !== 'function') {
        console.trace(typeof callback + ' is not a function');
    }
    return nextTick(callback);
};
app.post('/count', function(req, res) {
    var clientId = req.body.id;
    if (progressCount[clientId]) {
        res.json(progressCount[clientId]);
    } else {
        res.json({
            doneRows: 0,
            toDo: 0,
            failedRows: 0
        });
    }
});

/*app.post('/fileUpload', upload.single('csv'), function(req, res) {
    console.log("## FILE UPLOAD");
    var fileName = req.file.filename;

    rows = new Array();
    lineReader.eachLine('uploads/' + fileName, function(line) {
        rows.push(line);
    }).then(function() {

        email = req.body.email;
        url = req.body.url;
        password = req.body.password;
        workspace = req.body.workspace;
        clientId = req.body.clientId;

        progressCount[clientId] = {
            doneRows: 0,
            toDo: rows.length,
            failedRows: 0,
            totalRows: rows.length
        };

        var loginUrl = {
            headers: {
                'content-type': 'application/json'
            },
            url: 'https://api.arenasolutions.com/v1/login',
            body: JSON.stringify({
                "email": email,
                "password": password,
                "workspaceId": workspace
            })
        };

        request.post(loginUrl, function(err, httpResponse, body) {
            accessToken = JSON.parse(body).arenaSessionId;
            console.log("accessToken");
            console.log(accessToken);

            var categoriesEndpoint = {
                headers: {
                    'content-type': 'application/json',
                    'arena_session_id': accessToken
                },
                url: 'https://api.arenasolutions.com/v1/items/categories',
                body: JSON.stringify({
                    "email": email,
                    "password": password,
                    "workspaceId": workspace
                })
            };

            request.get(categoriesEndpoint, categoryEndpoints);
        });
    });
});*/

app.post('/postFile',upload.single('csv'),function(req, res) {
    console.log("## FILE postFile");
    var fileName = req.file.filename;

    rows = new Array();
    lineReader.eachLine('uploads/' + fileName, function(line) {
        rows.push(line);
    }).then(function() {

        email = req.body.email;
        url = req.body.url;
        password = req.body.password;
        workspace = req.body.workspace;
        clientId = req.body.clientId;

        progressCount[clientId] = {
            doneRows: 0,
            toDo: rows.length,
            failedRows: 0,
            totalRows: rows.length
        };
  io.emit('totalRows',{length:rows.length-1});
        var loginUrl = {
            headers: {
                'content-type': 'application/json'
            },
            url: 'https://api.arenasolutions.com/v1/login',
            body: JSON.stringify({
                "email": email,
                "password": password,
                "workspaceId": workspace
            })
        };

        request.post(loginUrl, function(err, httpResponse, body) {
            accessToken = JSON.parse(body).arenaSessionId;
            console.log("accessToken");
            console.log(accessToken);

            var categoriesEndpoint = {
                headers: {
                    'content-type': 'application/json',
                    'arena_session_id': accessToken
                },
                url: 'https://api.arenasolutions.com/v1/items/categories',
                body: JSON.stringify({
                    "email": email,
                    "password": password,
                    "workspaceId": workspace
                })
            };

            request.get(categoriesEndpoint, categoryEndpoints);
            res.json({status:true});
        });
    });
});
/*********************************************************************************************

 ENDPOINT: categoriesEndpoint
 PURPOSE: RETRIEVES CATEGORY NAME, CATEGORY GUID, NUMBER FORMAT GUID, ITEM PATH
 Follow Up:

 *********************************************************************************************/

function categoryEndpoints(err, httpResponse, body){
    //

    console.log("accesstoken = ", accessToken);
    var finalData = body.replace(/\\/g, "");
    var categoryResults = JSON.parse(finalData).results;
    //async.each(categoryResults, saveCategory, function(err){});
    for (var i = categoryResults.length - 1; i >= 0; i--) {
        if (categoryResults[i].hasOwnProperty('numberFormat')){
            var info = {categoryguid: categoryResults[i].guid, numberguid: categoryResults[i].numberFormat.guid};
            testArray[categoryResults[i].name] = testArray[categoryResults[i].name] || [];
            testArray[categoryResults[i].name] = info; //Is named after the category and has category GUID and numberFormat GUID attributes
            categories[categoryResults[i].path] = categoryResults[i].guid; //Is named after the path and has category GUID key value pair
            console.log("guid = ", categories[categoryResults[i].path]);

            //categoryAttributesEndpoint(categoryResults[i].guid);
        }
        else{
            //make the check in the convert json function to replace empty values
            console.log("No Number Format for ", categoryResults[i].name);
            var info = {categoryguid: categoryResults[i].guid, numberguid: 'FXH05VWW5CV4N6MNGHDF'};
        }
    }; /* END categoriesEndpoint FOR LOOP */
    console.log("categories")
    console.log(categories)
    numberFormatsEndpoint();
}

/********************************************************

 ENDPOINT: category Attributes Endpoint
 PURPOSE: RETRIEVES CATEGORY Attributes...
 Follow Up:

 *********************************************************/

function categoryAttributesEndpoint(categoryguid){
    request.get({
        headers: {
            'content-type': 'application/json',
            'arena_session_id': accessToken
        },
        url: 'https://api.arenasolutions.com/v1/items/categories/'+categoryguid,//categoryguid
        body: JSON.stringify({
            "email": email,
            "password": password,
            "workspaceId": workspace
        })
    }, function(err, httpResponse, body) {
        var catAttResults = JSON.parse(body);
        individualItemCategory.push(catAttResults);

    });
}

/********************************************************

 ENDPOINT: Number Formats Endpoint
 PURPOSE: Gives us all of the Number Format GUIDs and the Corresponding Category Names
 Follow Up: Use Number Format GUID in the Individiual Item Number Endpoint to get the Item Number apiName

 *********************************************************/

function numberFormatsEndpoint(){
    request.get({
        headers: {
            'content-type': 'application/json',
            'arena_session_id': accessToken
        },
        url: 'https://api.arenasolutions.com/v1/items/numberformats',
        body: JSON.stringify({
            "email": email,
            "password": password,
            "workspaceId": workspace
        })
    }, individualNumberFormats);
}

/********************************************************

 ENDPOINT: Individual Number Formats Endpoint
 PURPOSE: Gives us the Item Number apiName
 Follow Up: Pass The Item Number apiName to the Convert to JSON function

 *********************************************************/

function individualNumberFormats(err, httpResponse, body){
    var numFormatResults = JSON.parse(body).results;
    function asyncLoop( m, callback ) {
        if( m > 0) {
            var searchName = String(numFormatResults[m].name).split(/-(.+)?/)[1];
            if(typeof searchName != "undefined" && searchName !== 'undefined' && typeof testArray[searchName] != "undefined"){
                console.log("Adding number api name from guid = , ", numFormatResults[m].guid);
                request.get({
                    headers: {
                        'content-type': 'application/json',
                        'arena_session_id': accessToken
                    },
                    url: 'https://api.arenasolutions.com/v1/items/numberformats/'+numFormatResults[m].guid,
                    body: JSON.stringify({
                        "email": email,
                        "password": password,
                        "workspaceId": workspace
                    })
                },function(err, httpResponse, body){
                    var indNumFormatResults = JSON.parse(body);
                    testArray[searchName].numberapiname = indNumFormatResults.fields[0].apiName;
                    asyncLoop(m-1,callback);
                });

            }
            else{
                asyncLoop(m-1,callback);
            }


        }else {
            callback();
        }
    }
    asyncLoop(numFormatResults.length - 1, function() {
        console.log("loop completed")
        waterFallImplementation();
        // put the code that should happen after the loop here
    });
}
function individualNumberFormatsResults(err, httpResponse, body){
    // console.log(body);
    //var data = body;
    var indNumFormatResults = JSON.parse(body);
    /*console.log("INDIVIDUALllllllllllllllllll");
     console.log(indNumFormatResults);
     console.log("****INDIVIDUAL ITEM NUMBER RESULTS = ", indNumFormatResults);*/

    testArray[searchName].numberapiname = indNumFormatResults.fields[0].apiName;
    console.log("!!!!!!!!!!")
    console.log(testArray[searchName])
    console.log("Added Number API Name = ", indNumFormatResults.fields[0].apiName);

    //***** FINALLY COMPILE THE LIST OF ITEMS AND MAKE THE CALL TO FORM THE JSON *****//*



    var failedItems = new Array();
    console.log("starting each loop");
    //async.eachLimit(rows, 100, compileItems, itemError);

}
var errorCode=[3007,3015,3001,3009,3011,3004,400,3005,3006,4004];
var failedRowsArray=[];
var failedReasons=[];

function waterFallImplementation(){

    function asyncLoop( i, callback ) {
        if( i < rows.length) {
            io.emit('current', { rows: i});
            postItems(i,rows[i],function(){
                asyncLoop(i+1,callback);
            });

        }
        else {
            callback();
        }
    }
    failedRowsArray.push(rows[0]);
    asyncLoop(1, function() {
        console.log("file processed competeley")
        io.emit('errorCsv', {failedRows:failedRowsArray,failedReasons:failedReasons});
        console.log("failedRows");
        console.log(failedRowsArray);
        // put the code that should happen after the loop here
    });
}


function itemError(err){
    //res.writeHead(201, {'Content-Type': 'text/event-stream'});
    res.json({
        status: 'success',
        failedItems: failedItems
    });
}


function postItems(num,unparsedRow,callback){
    row = unparsedRow.split(',');
    console.log(row[0]);
    if (row[0] === 'item number') {
        console.log("header row")
        progressCount[clientId].doneRows++;
        //console.log(progressCount[clientId].doneRows++);
        callback();

    }
    console.log("erret")
    var temp = "Item"+String(row[3]).replace(/"/g,'');
    var currentItem = String(row[4]).replace(/"/g,'');
    var categoryGuid = categories[temp];
    if (categoryGuid) {
        //  console.log('###category guid');
        itemJson = convertRowToJson(row, testArray[currentItem]);
        var itemCreation = {
            headers: {
                'content-type': 'application/json',
                'arena_session_id': accessToken
            },
            url: 'https://api.arenasolutions.com/v1/items',
            body: JSON.stringify(itemJson)
        };

        request.post(itemCreation,function(err, httpResponse, body){

            var index=-1;
            index=errorCode.indexOf(httpResponse.statusCode);
            console.log("httpResponse.body")
            console.log(num)
            console.log(JSON.parse(httpResponse.body))
            var reason=JSON.parse(httpResponse.body);
            if(httpResponse.statusCode == 201 || httpResponse.statusCode == 200){
                console.log("passed rows")
                progressCount[clientId].doneRows++;
                io.emit('updatePassed', { rows: progressCount[clientId].doneRows});
            }
            else{
                console.log("failed rows")
                progressCount[clientId].failedRows++;
                io.emit('updateFailed', { rows: progressCount[clientId].failedRows});
                failedRowsArray.push(unparsedRow)
                failedReasons.push({rowNumber:row[0],rowName:row[1],csvRowNum:num,body:body,reason:reason.errors[0].message,status:reason.status,code:reason.errors[0].code});
                //    console.log("item creation error");
            }
            callback();
        });

    }else{
        progressCount[clientId].failedRows++;
        failedReasons.push({rowNumber:row[0],rowName:row[1],csvRowNum:num,body:"",reason:"category id not found",status:"",code:""});
        io.emit('updatePassed', { rows: progressCount[clientId].doneRows});
        callback();
    }
}
function compileItems(unparsedRow, callback){
    console.log("unparsedRow")
    console.log(unparsedRow)
    cb = callback;
    row = unparsedRow.split(',');
    //console.log(row);
    if (row[0] === 'item number') {
        progressCount[clientId].doneRows++;
        //console.log(progressCount[clientId].doneRows++);
        callback();

    }
    var temp = "Item"+String(row[3]).replace(/"/g,'');
    var currentItem = String(row[4]).replace(/"/g,'');
    /* console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
     console.log(temp)
     console.log(currentItem)
     console.log(row)
     console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");*/
    var categoryGuid = categories[temp];
    //   console.log("currentItem = ", currentItem);
    //console.log("category guid = ", categoryGuid);
    //  console.log("%%% Current Item = ", typeof testArray[currentItem]);
    if (typeof testArray[currentItem] === 'undefined') {

    }else{
        //   console.log("%%% Current GUID = ", testArray[currentItem].categoryguid);
    }


    if (categoryGuid) {
        //  console.log('###category guid');
        itemJson = convertRowToJson(row, testArray[currentItem]);

        var itemCreation = {
            headers: {
                'content-type': 'application/json',
                'arena_session_id': accessToken
            },
            url: 'https://api.arenasolutions.com/v1/items',
            body: JSON.stringify(itemJson)
        };

        request.post(itemCreation,function(err, httpResponse, body){

            if (httpResponse.statusCode !== 201) {
                console.log("item creation error");
                //console.log(httpResponse.statusCode);
                failedRows++;
                console.log("failed row")
                name = itemJson.name;
                delete itemJson.name;

                itemJson.number = row[0];
                itemJson.name = name;
                itemJson.failedReason = body;

                if (itemJson.number && itemJson.name && itemJson.failedReason) {

                    //console.log(itemJson.failedReason);
                    //failedItems.push(itemJson);
                }
                //io.emit('failed', { rows: failedRows});
                io.emit('updateFailed', { rows: failedRows});
            }

            console.log("passes rows")
            progressCount[clientId].doneRows++;
            io.emit('updatePassed', { rows: progressCount[clientId].doneRows});


        });

    } else {
        progressCount[clientId].doneRows++;
        //  console.log("### No Category GUID");
        itemJson = convertRowToJson(row, categoryGuid);
        if (itemJson.name && itemJson.name != 'item_name') {
            name = itemJson.name;

            delete itemJson.name;
            itemJson.number = row[0];
            itemJson.name = name;
            itemJson.failedReason = 'No category';

            if (itemJson.number && itemJson.name && itemJson.failedReason) {
                console.log(itemJson.failedReason);
                //failedItems.push(itemJson);
            }
            //io.emit('failed', { rows: failedRows});
            progressCount[clientId].failedRows++;
        }

        process.nextTick(function() {
            //io.emit('progress', { rows: progressCount[clientId].doneRows});
            callback();
        });
    }


}
function createItemResult(err, httpResponse, body){
    console.log("httpResponse")
    console.log(httpResponse.statusCode)
    if (httpResponse.statusCode !== 201) {
        console.log("item creation error");
        //console.log(httpResponse.statusCode);
        failedRows++;
        console.log("failed row")
        name = itemJson.name;
        delete itemJson.name;

        itemJson.number = row[0];
        itemJson.name = name;
        itemJson.failedReason = body;

        if (itemJson.number && itemJson.name && itemJson.failedReason) {

            //console.log(itemJson.failedReason);
            //failedItems.push(itemJson);
        }
        //io.emit('failed', { rows: failedRows});
    }
    console.log("passes rows")
    progressCount[clientId].doneRows++;

    process.nextTick(function() {
        //io.emit('progress', { rows: progressCount[clientId].doneRows++});
        console.log("IN NEXT TICK");
        console.log("typeof callback = ", typeof cb);
        cb();
    });

}
function readRows(){

}



function searchme(nameKey, myArray){
    console.log("SEARCH MYARRAY = ", myArray);
    if(typeof myArray[nameKey] != "undefined"){
        return myArray[nameKey];
    }
    else{
        return;
    }
}

function convertRowToJson(row, myItem) {
    if (typeof myItem === 'undefined') {
        console.log("empty row, skipping..");
        return false;
    }

    //  console.log("JSON = ", myItem);


    var itemJson = {
        "name": String(row[1]).replace(/"/g,''),
        "numberFormat": {
            "guid": myItem.numberguid,
            "fields":
                [
                    {"apiName":myItem.numberapiname, "value":String(row[0]).replace(/"/g,'').substr(0,3)}
                ]
        },
        "uom": String(row[6]).replace(/"/g,''),
        "category": {
            "guid": myItem.categoryguid
        },
        "description": String(row[5]).replace(/"/g,''),
        "revisionNumber": String(row[2]).replace(/"/g,'')
    };
console.log("item json ");
    console.log(itemJson)
    console.log("!!!!!!!!!")
    console.log({"apiName":myItem.numberapiname, "value":String(row[0]).replace(/"/g,'')})
    console.log("!!!!!!!!")
    //  console.log("itemJson = ", itemJson);
    //console.log("itemJson.category = ", itemJson.category);

    /*if(!itemJson.category){
     delete itemJson.category;
     }*/

    return itemJson;
}


var server = app.listen(3000, function() {
    var host = server.address().address;
    var port = server.address().port;
    var exclusive = true;

    console.log('Arena app listening at http://%s:%s', host, port);
});
io = require('socket.io').listen(server);
io.on('connection', function(socket){
    console.log("connected")

});
