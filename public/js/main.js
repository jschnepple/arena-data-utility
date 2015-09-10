var currentId = guid();
var isRunning = false;
var globalRows;
var globalCount = 0;

// $(function() {
//     function fileInfo(e) {
//         var file = e.target.files[0];
//         if (file.name.split(".")[1].toUpperCase() != "CSV") {
//             alert('Invalid csv file !');
//             e.target.parentNode.reset();
//             return;
//         } else {}
//     }

//     var globalFailedRows;

//     $('#download-button').click(function() {
//         if (globalFailedRows && globalFailedRows.length > 0) {
//             exportToCsv('failedRows.csv', globalFailedRows);
//         }
//     });

//     function handleFileSelect() {

//         var file = document.getElementById("the_file").files[0];
//         console.log(file);

//         $('#error-body').parent().fadeOut();
//         $('#download-button').fadeOut();
//         $('#totalItems').html(globalCount - 1);
//         isRunning = true;

//         var formData = new FormData();
//         formData.append('csv', file);
//         formData.append("url", $('#url').val());
//         formData.append("email", $('#email').val());
//         formData.append("password", $('#password').val());
//         formData.append("workspace", $('#workspaceID').val());
//         formData.append("id", currentId);

//         console.log(formData);

//         var xhr = new XMLHttpRequest();
//         xhr.open('POST', '/fileUpload', true);

//         // Set up a handler for when the request finishes
//         xhr.onload = function() {
//             var response = xhr.response;
//             console.log(response);

//             isRunning = false;
//             return;
//             globalFailedRows = response.failedItems;


//             $('#currentItem').html(globalCount - 1);
//             $('#numberErrors').html(globalFailedRows.length - 1);
//             $('.cloned-row').remove();

//             if (response.failedItems.length > 0) {
//                 $('#error-body').parent().fadeIn();
//                 $('#download-button').fadeIn();
//             }

//             for (var i = response.failedItems.length - 1; i >= 0; i--) {
//                 // Update failed rows
//                 var cloned = $('.clone-row').eq(0).clone().removeClass('clone-row');

//                 if (response.failedItems[i].number && response.failedItems[i].name && response.failedItems[i].failedReason) {
//                     $(cloned).children().eq(0).html(response.failedItems[i].number);
//                     $(cloned).children().eq(1).html(response.failedItems[i].name);
//                     $(cloned).children().eq(2).html(response.failedItems[i].failedReason);

//                     $(cloned).addClass('cloned-row');
//                     $('#error-body').append(cloned);
//                 }

//             };
//         };

//         xhr.send(formData);

//         setInterval(function() {

//             if (isRunning) {
//                 $.post('/count', {
//                     id: currentId
//                 }).done(function(response) {
//                     $('#currentItem').html(response.doneRows);
//                     $('#numberErrors').html(response.failedRows);
//                 });
//             }
//         }, 1000);
//     }

//     document.getElementById('the_form').addEventListener('submit', handleFileSelect, false);
//     document.getElementById('the_file').addEventListener('change', fileInfo, false);
// });

var totalRows = 0;
var isDoneUploading = false;
$(document).ready(function() {
    $('#clientId').val(currentId);

    $('#the_form').submit(function() {

        //$('#error-body').parent().fadeOut();
        $('#download-button').fadeOut();
        $('#totalItems').html(0);
        isDoneUploading = false;
        isRunning = true;

        $('#status-message').html('Status: Uploading');
        $('#status-message').show();

        setInterval(function() {

            if (isRunning) {
                $.post('/count', {
                    id: currentId
                }).done(function(response) {
                    $('#currentItem').html(response.doneRows);
                    //$('#numberErrors').html(response.failedRows);
                    
                    if ((response.totalRows - 1) > 0) {
                        $('#totalItems').html(response.totalRows - 1);
                    } else {
                        $('#totalItems').html(0);
                    }

                    totalRows = response.totalRows - 1;

                    if (totalRows > 0 && !isDoneUploading) {
                        isDoneUploading = true;
                        $('#status-message').html('Status: Processing');
                    }

                });
            }
        }, 1000);

        $(this).ajaxSubmit({
            error: function(xhr) {
                $('#status-message').html('An error occurred');
            },
            success: function(response) {
                isRunning = false;
                $('#status-message').html('Status: Complete');
                globalFailedRows = response.failedItems;

                $('#currentItem').html(totalRows);
                //$('#numberErrors').html(globalFailedRows.length - 1);
                $('.cloned-row').remove();

                if (response.failedItems.length > 0) {
                    $('#error-body').parent().fadeIn();
                    $('#download-button').fadeIn();
                }

                // for (var i = response.failedItems.length - 1; i >= 0; i--) {
                //     // Update failed rows
                //     var cloned = $('.clone-row').eq(0).clone().removeClass('clone-row');

                //     if (response.failedItems[i].number && response.failedItems[i].name && response.failedItems[i].failedReason) {
                //         $(cloned).children().eq(0).html(response.failedItems[i].number);
                //         $(cloned).children().eq(1).html(response.failedItems[i].name);
                //         $(cloned).children().eq(2).html(response.failedItems[i].failedReason);

                //         $(cloned).addClass('cloned-row');
                //         $('#error-body').append(cloned);
                //     }

                // };
            }
        });
        // Have to stop the form from submitting and causing                                                                                                       
        // a page refresh - don't forget this                                                                                                                      
        return false;
    });
});

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}