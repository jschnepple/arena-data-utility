var express = require('express'),
    path = require('path'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    request = require('request'),
    async = require('async'),
    fs = require('fs');

var lineReader = require('line-reader');
var multer = require('multer');
var upload = multer({
    dest: 'uploads/'
});

var app = express();
//var io = require('socket.io')(app);
app.use(bodyParser.urlencoded({
    extended: true,
    parameterLimit: 1000000000,
    limit: '1000mb'
}));

app.use(bodyParser.json({
    extended: false,
    parameterLimit: 100000000,
    limit: '1000mb'
}));

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

app.post('/fileUpload', upload.single('csv'), function(req, res) {
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
            
            categoryAttributesEndpoint(categoryResults[i].guid);
        }
        else{
            //make the check in the convert json function to replace empty values
            console.log("No Number Format for ", categoryResults[i].name);
            var info = {categoryguid: categoryResults[i].guid, numberguid: 'FXH05VWW5CV4N6MNGHDF'}; 
        }
    }; /* END categoriesEndpoint FOR LOOP */
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
        url: 'https://api.arenasolutions.com/v1/items/categories/O6Q9E4RX3O7H0JV2CS8H/attributes/',//categoryguid
        body: JSON.stringify({
            "email": email,
            "password": password,
            "workspaceId": workspace
        })
    }, function(err, httpResponse, body) {
        var catAttResults = JSON.parse(body).results;
        console.log("category Attributes Endpoint RESULTS = ", catAttResults);

    });
}

/********************************************************

        ENDPOINT: Number Formats Endpoint
        PURPOSE: Gives us all of the Number Format GUIDs and the Corresponding Category Names
        Follow Up: Use Number Format GUID in the Individiual Item Number Endpoint to get the Item Number apiName

*********************************************************/

function numberFormatsEndpoint(categoryguid){
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
    //var data = body;
    var numFormatResults = JSON.parse(body).results;
    console.log("****ITEM NUMBER RESULTS = ", numFormatResults);
    console.log("????? ITEM TEST ARRAY", testArray);
    for (var m = numFormatResults.length - 1; m >= 0; m--) {
        searchName = String(numFormatResults[m].name).split(/-(.+)?/)[1];
        console.log("SEARCH STRING = ", String(searchName));
        //resultObject[m] = searchme(String(searchName), testArray);
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
            }, individualNumberFormatsResults);

        }
    }
}

function individualNumberFormatsResults(err, httpResponse, body){
    console.log(body);
    //var data = body;
    var indNumFormatResults = JSON.parse(body);
    console.log("****INDIVIDUAL ITEM NUMBER RESULTS = ", indNumFormatResults);

    testArray[searchName].numberapiname = indNumFormatResults.fields[0].apiName;
    console.log("Added Number API Name = ", indNumFormatResults.fields[0].apiName);

    /***** FINALLY COMPILE THE LIST OF ITEMS AND MAKE THE CALL TO FORM THE JSON *****/

    console.log("$$$ Test Array = ", testArray);

    var failedItems = new Array();
    console.log("starting each loop");
    async.eachLimit(rows, 100, compileItems, itemError);
}

function itemError(err){   
    //res.writeHead(201, {'Content-Type': 'text/event-stream'});
    res.json({
        status: 'success',
        failedItems: failedItems
    });
}

function compileItems(unparsedRow, callback){
    cb = callback;
    row = unparsedRow.split(',');
    //console.log(row);
    if (row[0] === 'item_number') {
        progressCount[clientId].doneRows++;
        console.log(progressCount[clientId].doneRows++);
        process.nextTick(function() {
            console.log("next tick 271");
        //io.emit('progress', { rows: progressCount[clientId].doneRows});
            callback(); 
        });
        return;
    }
    var temp = "Item"+String(row[3]).replace(/"/g,'');
    var currentItem = String(row[4]).replace(/"/g,'');

    var categoryGuid = categories[temp];
    console.log("currentItem = ", currentItem);
    //console.log("category guid = ", categoryGuid);
    console.log("%%% Current Item = ", typeof testArray[currentItem]);
    if (typeof testArray[currentItem] === 'undefined') {

    }else{
        console.log("%%% Current GUID = ", testArray[currentItem].categoryguid);
    }


    if (categoryGuid) {
        console.log('###category guid');
        itemJson = convertRowToJson(row, testArray[currentItem]);

        var itemCreation = {
            headers: {
                'content-type': 'application/json',
                'arena_session_id': accessToken
            },
            url: 'https://api.arenasolutions.com/v1/items',
            body: JSON.stringify(itemJson)
        };

        request.post(itemCreation, createItemResult);

    } else {
        progressCount[clientId].doneRows++;
        console.log("### No Category GUID");
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
    if (httpResponse.statusCode !== 201) {
        console.log("item creation error");
        //console.log(httpResponse.statusCode);
        failedRows++;
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

    console.log("JSON = ", myItem);

    var itemJson = {
        "name": String(row[1]).replace(/"/g,''),
        "numberFormat": {
            "guid": myItem.numberguid,
            "fields":
              [
                {"apiName":myItem.numberapiname, "value":String(row[0]).replace(/"/g,'')}
              ]
        },
        "uom": String(row[6]).replace(/"/g,''),
        "category": {
            "guid": myItem.categoryguid
        },
        "description": String(row[5]).replace(/"/g,''),
        "revisionNumber": String(row[2]).replace(/"/g,''),
        "additionalAttributes": []
    };

    console.log("itemJson = ", itemJson);
    console.log("itemJson.category = ", itemJson.category);

    /*if(!itemJson.category){
        delete itemJson.category;
    }*/

    return itemJson;
}


var server = app.listen(9876, function() {
    var host = server.address().address;
    var port = server.address().port;
    var exclusive = true;

    console.log('Arena app listening at http://%s:%s', host, port);
});
