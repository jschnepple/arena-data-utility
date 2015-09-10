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
var io = require('socket.io')(app);
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
var runonce = true, runonce2 = true;
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

    var rows = new Array();
    lineReader.eachLine('uploads/' + fileName, function(line) {
        rows.push(line);
    }).then(function() {

        var email = req.body.email;
        var url = req.body.url;
        var password = req.body.password;
        var workspace = req.body.workspace;
        var clientId = req.body.clientId;

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
            var accessToken = JSON.parse(body).arenaSessionId;
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
            /*categoriesEndpoint
                Purpose: RETRIEVES CATEGORY NAME, CATEGORY GUID, NUMBER FORMAT GUID, ITEM PATH
                Follow Up: 

            */
            request.get(categoriesEndpoint, function(err, httpResponse, body) { //
                var finalData = body.replace(/\\/g, "");
                var categoryResults = JSON.parse(finalData).results;
//async.eachLimit(rows, 100
                for (var i = categoryResults.length - 1; i >= 0; i--) {
                    if (categoryResults[i].hasOwnProperty('numberFormat')){
                        var info = {categoryguid: categoryResults[i].guid, numberguid: categoryResults[i].numberFormat.guid};
                        testArray[categoryResults[i].name] = testArray[categoryResults[i].name] || [];
                        testArray[categoryResults[i].name] = info; //Is named after the category and has category GUID and numberFormat GUID attributes
                        categories[categoryResults[i].path] = categoryResults[i].guid; //Is named after the path and has category GUID key value pair
                        
                        console.log("guid = ", categories[categoryResults[i].path]);

            /*category Attributes Endpoint
                Purpose: RETRIEVES CATEGORY Attributes...
                Follow Up: */

            
                        if(runonce2){
                        request.get({
                            headers: {
                                'content-type': 'application/json',
                                'arena_session_id': accessToken
                            },
                            url: 'https://api.arenasolutions.com/v1/items/categories/O6Q9E4RX3O7H0JV2CS8H/attributes/',//categoryResults[i].guid
                            body: JSON.stringify({
                                "email": email,
                                "password": password,
                                "workspaceId": workspace
                            })
                        }, function(err, httpResponse, body) {
                            var catAttResults = JSON.parse(body).results;
                            console.log("category Attributes Endpoint RESULTS = ", catAttResults);

                        });
                            runonce2 = false;
                        }
            


            /*Number Formats Endpoint
                Purpose: Gives us all of the Number Format GUIDs and the Corresponding Category Names
                Follow Up: Use Number Format GUID in the Individiual Item Number Endpoint to get the Item Number apiName
            */
   
                        if(runonce){
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
                        }, function(err, httpResponse, body) {
                            //var data = body;
                            var numFormatResults = JSON.parse(body).results;
                            console.log("****ITEM NUMBER RESULTS = ", numFormatResults);
                            console.log("????? ITEM TEST ARRAY", testArray);
                            for (var m = numFormatResults.length - 1; m >= 0; m--) {
                                var searchName = String(numFormatResults[m].name).split(/-(.+)?/)[1];
                                console.log("SEARCH STRING = ", String(searchName));
                                //resultObject[m] = searchme(String(searchName), testArray);
                                if(typeof searchName != "undefined" && searchName !== 'undefined' && typeof testArray[searchName] != "undefined"){
                                console.log("Adding number api name from guid = , ", numFormatResults[m].guid);
                               /*Individual Number Formats Endpoint
                                Purpose: Gives us the Item Number apiName
                                Follow Up: Pass The Item Number apiName to the Convert to JSON function
                                */ 
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
                                    }, function(err, httpResponse, body) {
                                        console.log(body);
                                        //var data = body;
                                        var indNumFormatResults = JSON.parse(body);
                                        console.log("****INDIVIDUAL ITEM NUMBER RESULTS = ", indNumFormatResults);

                                        testArray[searchName].numberapiname = indNumFormatResults.fields[0].apiName;
                                        console.log("Added Number API Name = ", indNumFormatResults.fields[0].apiName);

                                        /***** FINALLY COMPILE THE LIST OF ITEMS AND MAKE THE CALL TO FORM THE JSON *****/

                                        console.log("$$$ Test Array = ", testArray);
                                        console.log("M = ", m);
                                        console.log("numFormat.length = ", numFormatResults.length-1);
                                        if (m < 0){
                                        console.log("@@@ Test Array = ", testArray);

                                        var failedItems = new Array();
                                        console.log("starting each loop");
                                        async.eachLimit(rows, 100, function(unparsedRow, callback) {
                                            var row = unparsedRow.split(',');
                                            //console.log(row);
                                            if (row[0] === 'item_number') {
                                                progressCount[clientId].doneRows++;
                                                console.log(progressCount[clientId].doneRows++);
                                                process.nextTick(function() { callback(); })
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
                                                var itemJson = convertRowToJson(row, testArray[currentItem]);

                                                var itemCreation = {
                                                    headers: {
                                                        'content-type': 'application/json',
                                                        'arena_session_id': accessToken
                                                    },
                                                    url: 'https://api.arenasolutions.com/v1/items',
                                                    body: JSON.stringify(itemJson)
                                                };

                                                request.post(itemCreation, function(err, httpResponse, body) {
                                                    if (httpResponse.statusCode !== 201) {
                                                        console.log("item creation error");
                                                        //console.log(httpResponse.statusCode);
                                                        failedRows++;
                                                        var name = itemJson.name;
                                                        delete itemJson.name;

                                                        itemJson.number = row[0];
                                                        itemJson.name = name;
                                                        itemJson.failedReason = body;

                                                        if (itemJson.number && itemJson.name && itemJson.failedReason) {
                                            //console.log(itemJson.failedReason);
                                                            //failedItems.push(itemJson);
                                                        }

                                                    }

                                                    progressCount[clientId].doneRows++;
                                                    process.nextTick(function() { callback(); })
                                                });

                                            } else {
                                                progressCount[clientId].doneRows++;
                                                console.log("### No Category GUID");
                                                var itemJson = convertRowToJson(row, categoryGuid);
                                                if (itemJson.name && itemJson.name != 'item_name') {
                                                    var name = itemJson.name;

                                                    delete itemJson.name;
                                                    itemJson.number = row[0];
                                                    itemJson.name = name;
                                                    itemJson.failedReason = 'No category';

                                                    if (itemJson.number && itemJson.name && itemJson.failedReason) {
                                                        console.log(itemJson.failedReason);
                                                        //failedItems.push(itemJson);
                                                    }

                                                    progressCount[clientId].failedRows++;
                                                }

                                                process.nextTick(function() { callback(); })
                                            }

                                        }, function(err) {
                                            //res.writeHead(201, {'Content-Type': 'text/event-stream'});
                                            /*res.json({
                                                status: 'success',
                                                failedItems: failedItems
                                            });*/
                                        });
                                        }
                                    });

                                }
                            }



                        });
                            runonce = false;
                        }
                    }
                    else{
                        //make the check in the convert json function to replace empty values
                        console.log("No Number Format for ", categoryResults[i].name);
                        var info = {categoryguid: categoryResults[i].guid, numberguid: 'FXH05VWW5CV4N6MNGHDF'}; 
                    }
                    


                    
                    
                }; /* END categoriesEndpoint FOR LOOP */


            });
        });
    });
});
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

    // Voltage
    if (row[35]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666304",
            "value": row[35]
        });
    }

    // Owner Name
    // if (row[9]) {
    //     itemJson.additionalAttributes.push({
    //         "apiName": "owner.fullName",
    //         "value": row[9]
    //     });
    // }

    // Capacitance
    if (row[11]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666285",
            "value": row[11]
        });
    }

    // Diameter
    if (row[14]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666287",
            "value": row[14]
        });
    }

    // Drive Type
    if (row[15]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666288",
            "value": row[15]
        });
    }

    // Footprint
    if (row[16]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666289",
            "value": row[16]
        });
    }

    // Frequency
    if (row[17]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666290",
            "value": row[17]
        });
    }

    // Head Type
    if (row[18]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666291",
            "value": row[18]
        });
    }

    // Length
    if (row[19]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666292",
            "value": row[19]
        });
    }

    // Material
    if (row[20]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666293",
            "value": row[20]
        });
    }

    // Package
    if (row[22]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666294",
            "value": row[22]
        });
    }

    // Pins
    if (row[23]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666295",
            "value": row[23]
        });
    }

    // Power
    if (row[24]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666296",
            "value": row[24]
        });
    }

    // Resistance
    if (row[25]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666297",
            "value": row[25]
        });
    }

    // Rows
    if (row[27]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666298",
            "value": row[27]
        });
    }

    // Screw Type
    if (row[28]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666299",
            "value": row[28]
        });
    }

    // Speed
    if (row[29]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666300",
            "value": row[29]
        });
    }

    // Symbol
    if (row[31]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666301",
            "value": row[31]
        });
    }

    // Tolerance
    if (row[33]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666302",
            "value": row[33]
        });
    }

    // Value
    if (row[34]) {
        itemJson.additionalAttributes.push({
            "apiName": "custom269666303",
            "value": row[34]
        });
    }

    return itemJson;
}


var server = app.listen(9876, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Arena app listening at http://%s:%s', host, port);
});
